FROM public.ecr.aws/lambda/python:3.12

# Install LibreOffice and dependencies
RUN yum install -y \
    libreoffice \
    libreoffice-headless \
    poppler-utils \
    && yum clean all \
    && rm -rf /var/cache/yum

# Create symlink for LibreOffice
RUN mkdir -p /opt/bin && \
    ln -s /usr/bin/soffice /opt/bin/soffice

# Copy requirements and install Python dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install -r ${LAMBDA_TASK_ROOT}/requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy function code
COPY index.py ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD [ "index.handler" ]
