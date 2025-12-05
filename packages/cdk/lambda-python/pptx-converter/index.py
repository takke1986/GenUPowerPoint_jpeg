import json
import os
import subprocess
import tempfile
import boto3
from pathlib import Path
from PIL import Image
import io

s3_client = boto3.client('s3')

# Maximum slide count limit
MAX_SLIDES = 20

# Maximum file size (3.75MB in bytes)
MAX_IMAGE_SIZE = 3_750_000

def handler(event, context):
    """
    Convert PowerPoint to JPEG images

    Expected event format:
    {
        "bucketName": "bucket-name",
        "fileKey": "uuid/presentation.pptx",
        "fileName": "presentation.pptx"
    }
    """
    try:
        bucket_name = event['bucketName']
        file_key = event['fileKey']
        file_name = event['fileName']

        # Extract UUID from fileKey
        uuid = file_key.split('/')[0]

        print(f"Converting PowerPoint: {file_key}")

        # Create temporary directory
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)

            # Download PowerPoint from S3
            pptx_path = tmp_path / file_name
            s3_client.download_file(bucket_name, file_key, str(pptx_path))

            # Convert to PDF using LibreOffice
            pdf_path = convert_pptx_to_pdf(pptx_path, tmp_path)

            # Convert PDF to images
            image_files = convert_pdf_to_images(pdf_path, tmp_path)

            # Check slide count
            if len(image_files) > MAX_SLIDES:
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': f'PowerPointのスライド数が{MAX_SLIDES}枚を超えています。（{len(image_files)}枚）',
                        'slideCount': len(image_files)
                    })
                }

            # Optimize and upload images to S3
            uploaded_images = []
            base_name = Path(file_name).stem

            for i, img_path in enumerate(image_files, 1):
                # Optimize image
                optimized_img = optimize_image(img_path)

                # Generate S3 key
                s3_key = f"{uuid}/{base_name}_slide_{i:03d}.jpg"

                # Upload to S3
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=s3_key,
                    Body=optimized_img,
                    ContentType='image/jpeg'
                )

                uploaded_images.append({
                    'slideNumber': i,
                    's3Key': s3_key,
                    'fileName': f"{base_name}_slide_{i:03d}.jpg"
                })

                print(f"Uploaded slide {i}/{len(image_files)}: {s3_key}")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Conversion successful',
                'slideCount': len(uploaded_images),
                'images': uploaded_images
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f'変換中にエラーが発生しました: {str(e)}'
            })
        }


def convert_pptx_to_pdf(pptx_path: Path, output_dir: Path) -> Path:
    """Convert PowerPoint to PDF using LibreOffice"""
    try:
        # LibreOffice command
        cmd = [
            '/opt/bin/soffice',
            '--headless',
            '--invisible',
            '--nodefault',
            '--nofirststartwizard',
            '--nolockcheck',
            '--nologo',
            '--norestore',
            '--convert-to', 'pdf',
            '--outdir', str(output_dir),
            str(pptx_path)
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120
        )

        if result.returncode != 0:
            raise Exception(f"LibreOffice conversion failed: {result.stderr}")

        pdf_path = output_dir / f"{pptx_path.stem}.pdf"
        if not pdf_path.exists():
            raise Exception("PDF file was not created")

        return pdf_path

    except subprocess.TimeoutExpired:
        raise Exception("Conversion timeout (120 seconds)")
    except Exception as e:
        raise Exception(f"Failed to convert to PDF: {str(e)}")


def convert_pdf_to_images(pdf_path: Path, output_dir: Path) -> list:
    """Convert PDF to JPEG images using pdf2image"""
    try:
        from pdf2image import convert_from_path

        # Convert PDF pages to images with high DPI for quality
        images = convert_from_path(
            str(pdf_path),
            dpi=300,  # High resolution
            fmt='jpeg',
            thread_count=2
        )

        image_files = []
        for i, img in enumerate(images, 1):
            img_path = output_dir / f"slide_{i:03d}.jpg"
            img.save(str(img_path), 'JPEG', quality=95)
            image_files.append(img_path)

        return image_files

    except Exception as e:
        raise Exception(f"Failed to convert PDF to images: {str(e)}")


def optimize_image(img_path: Path) -> bytes:
    """Optimize image to be under 3.75MB while maintaining high quality"""
    try:
        with Image.open(img_path) as img:
            # Convert to RGB if necessary
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Start with high quality
            quality = 95

            while quality > 50:
                output = io.BytesIO()
                img.save(output, format='JPEG', quality=quality, optimize=True)
                size = output.tell()

                if size <= MAX_IMAGE_SIZE:
                    output.seek(0)
                    return output.read()

                # Reduce quality
                quality -= 5

            # If still too large, resize the image
            scale_factor = 0.9
            while True:
                new_width = int(img.width * scale_factor)
                new_height = int(img.height * scale_factor)
                resized_img = img.resize((new_width, new_height), Image.LANCZOS)

                output = io.BytesIO()
                resized_img.save(output, format='JPEG', quality=85, optimize=True)
                size = output.tell()

                if size <= MAX_IMAGE_SIZE:
                    output.seek(0)
                    return output.read()

                scale_factor *= 0.9

                if scale_factor < 0.3:
                    # Give up and return what we have
                    output.seek(0)
                    return output.read()

    except Exception as e:
        raise Exception(f"Failed to optimize image: {str(e)}")
