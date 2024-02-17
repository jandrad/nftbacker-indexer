#!/bin/bash

# The application log will be redirected to the main docker container process's stdout, so # that it will show up in the container logs
touch /thalos/logs/thalos_error.log
touch /thalos/logs/thalos_info.log

ln -sf /proc/1/fd/1 /thalos/logs/thalos_info.log
ln -sf /proc/1/fd/2 /thalos/logs/thalos_error.log

# Execute my app
/thalos/bin/thalos-server