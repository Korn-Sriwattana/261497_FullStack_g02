#!/bin/bash

for i in $(seq -w 1 25)
do
  USER="g${i}"
  PASSWORD="g${i}1234"
  
  # Create the user with a home directory and set bash as the default shell
  sudo useradd -m -s /bin/bash "$USER"
  
  # Set the user's password
  echo "${USER}:${PASSWORD}" | sudo chpasswd
  
  # Add the user to the docker group
  sudo usermod -aG docker "$USER"
  
  echo "Created user $USER with password $PASSWORD and added to docker group."
done