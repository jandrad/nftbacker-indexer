CREATE TABLE backed_nfts (
    asset_id BIGINT PRIMARY KEY NOT NULL,
    owner VARCHAR(13) NOT NULL,
    backed_tokens JSON,
    last_updated_global_sequence BIGINT NOT NULL,
    is_burned SMALLINT NOT NULL,
    unique_tokens SMALLINT NOT NULL,
    collection_name VARCHAR(13),
    schema_name VARCHAR(13),
    template_id INTEGER
);

CREATE TABLE burn_queue (
    asset_id BIGINT PRIMARY KEY NOT NULL,
    owner VARCHAR(13) NOT NULL,
    processed_state SMALLINT NOT NULL,
    time_submitted TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);