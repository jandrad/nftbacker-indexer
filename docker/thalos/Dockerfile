FROM debian:buster

ENV THALOS_VERSION 1.0.0

RUN apt-get update -y && \
    apt-get install curl wget -y && \ 
    curl -Ls "https://github.com/eosswedenorg/thalos/releases/download/v${THALOS_VERSION}/thalos-${THALOS_VERSION}-linux-arm64.tar.gz" | tar -z --one-top-level=thalos -xvf -

WORKDIR /thalos

COPY run.sh run.sh
CMD [ "/bin/bash", "run.sh" ]
