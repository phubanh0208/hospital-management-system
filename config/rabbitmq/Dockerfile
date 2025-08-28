FROM rabbitmq:3.13-management
ARG RMQ_VER=3.13.0
RUN set -eux; \
    apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*; \
    cd /opt/rabbitmq/plugins; \
    curl -fL -o rabbitmq_delayed_message_exchange-${RMQ_VER}.ez \
      https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v${RMQ_VER}/rabbitmq_delayed_message_exchange-${RMQ_VER}.ez; \
    rabbitmq-plugins enable --offline rabbitmq_management rabbitmq_delayed_message_exchange
