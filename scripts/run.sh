#!/bin/bash

echo
echo "Run script 1.0.0"
echo

# check for curl, install if needed
if command -v curl >/dev/null 2>&1; then
    echo "Checking for curl: ✅"
else
    echo "Checking for curl: Needs to be installed"
    sudo apt update > /dev/null 2>&1
    sudo apt install curl -y > /dev/null 2>&1
    echo "curl installed"
fi

# check for node, install if needed
if command -v node >/dev/null 2>&1; then
    echo "Checking for Node.js: ✅"
else
    echo "Checking for Node.js: Needs to be installed"

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash > /dev/null 2>&1

    export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

    source ~/.bashrc

    nvm install 21 > /dev/null 2>&1

    echo "Node installed"
fi

# check for git, install if needed
if command -v git >/dev/null 2>&1; then
    echo "Checking for git: ✅"
else
    echo "Checking for git: Needs to be installed"
    sudo apt update > /dev/null 2>&1
    sudo apt install git -y > /dev/null 2>&1
    echo "git installed"
fi

# check for docker, install if needed
if command -v docker >/dev/null 2>&1; then
    echo "Checking for docker: ✅"
else
    echo "Checking for docker: Needs to be
    installed"
    # Add Docker's official GPG key:
    sudo apt-get update > /dev/null 2>&1
    sudo apt-get install ca-certificates -y > /dev/null 2>&1
    sudo install -m 0755 -d /etc/apt/keyrings > /dev/null 2>&1
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc > /dev/null 2>&1
    sudo chmod a+r /etc/apt/keyrings/docker.asc > /dev/null 2>&1

    # Add the repository to Apt sources:
    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update > /dev/null 2>&1

    sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y > /dev/null 2>&1

    echo "docker installed"
fi

# Check if the docker group exists, and if it doesn't, create it
if ! getent group docker >/dev/null; then
    echo "Creating the docker group"
    sudo groupadd docker > /dev/null 2>&1
fi

# Check if the current user is a member of the docker group, and if they're not, add them to it
if ! groups ${USER} | grep &>/dev/null '\bdocker\b'; then
    echo "Adding the current user to the docker group"
    sudo usermod -aG docker ${USER} > /dev/null 2>&1

    echo "User permissions updated. Please run the script again."
    newgrp docker
fi

if [ ! -d "community" ]; then
    mkdir community
fi

if [ -f "community_version" ]; then
    CURRENT_VERSION=$(cat community_version)
else
    CURRENT_VERSION="0.0.0"
fi

curl -o community_version -L https://builds.internal.citizenwallet.xyz/community/version > /dev/null 2>&1

NEW_VERSION=$(cat community_version)

# check for community repo, clone if not exists
if [ "$CURRENT_VERSION" == "$NEW_VERSION" ]; then
    echo "Community: ✅"
else
    echo "Community: Needs to be updated"

    curl -o community.tar.gz -L "https://builds.internal.citizenwallet.xyz/community/dashboard_${NEW_VERSION}.tar.gz" > /dev/null 2>&1

    tar -xzf community.tar.gz -C community > /dev/null 2>&1

    echo "Community: ✅"
fi

# change directory to community
cd community

# trigger run script
echo "Launching community..."

npm i > /dev/null 2>&1

# ensure that the proper os/arch of sqlite3 is installed
npm i sqlite3@5.1.6 > /dev/null 2>&1

npm run community