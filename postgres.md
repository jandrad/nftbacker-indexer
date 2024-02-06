# Postgres configuration


## Database initialization
> CREATE DATABASE nft_backer;
> GRANT CONNECT, TEMPORARY ON DATABASE nft_backer TO waxdao;
> GRANT ALL PRIVILEGES ON DATABASE nft_backer TO waxdao;


## Table creation for backed NFTs
> \c nft_backer
> CREATE TABLE backed_nfts (
    asset_id BIGINT PRIMARY KEY NOT NULL,
    owner VARCHAR(13) NOT NULL,
    backed_tokens JSON,
    last_updated_global_sequence BIGINT NOT NULL,
    is_burned SMALLINT NOT NULL,
    unique_tokens SMALLINT NOT NULL
);
> GRANT ALL PRIVILEGES ON TABLE backed_nfts TO waxdao;
> CREATE INDEX owner_idx ON backed_nfts (owner);


## Table creation for queue of burned assets

> \c nft_backer
> CREATE TABLE burn_queue (
    asset_id BIGINT PRIMARY KEY NOT NULL,
    owner VARCHAR(13) NOT NULL,
    processed_state SMALLINT NOT NULL,
    time_submitted TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
> GRANT ALL PRIVILEGES ON TABLE burn_queue TO waxdao;
