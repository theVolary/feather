# Speech Tails Installation on EC2 #

## Install NVM

    git clone git://github.com/creationix/nvm.git ~/.nvm
    . ~/.nvm/nvm.sh
    nvm sync (find latest stable version)
    nvm install v0.X.Y (e.g. v0.4.12)
    sudo vim /etc/bash.bashrc
        NVM_HOME=~/.nvm
        . $NVM_HOME/nvm.sh
        nvm use v0.4.12
    cd ~/mainline

## Instal FVM

    git clone https://github.com/ryedin/fvm.git
    sudo vim /etc/bash.bashrc
        FVM_HOME=~/mainline/fvm
        . $FVM_HOME/fvm.sh
        fvm use v0.1.33
    fvm install v0.X.Y (e.g. v0.1.33)

## Get Speechtails Source

    ssh-keygen -t rsa
        Dir: ~/.ssh/id_rsa
        Passphrase: sdrma@thevolary
    cat ~/.ssh/id_rsa.pub

Copy the contents of the id_rsa.pub line for the key you just created, and add it as a deploy key to your github repo.

    git clone git@github.com:theVolary/Speech-Tails.git speechtails
    cd speechtails
    git checkout sprint1
    git pull origin sprint1
    sudo find speechtails -type f -exec chmod 644 {} \;

Copy the pem files for the ssl cert and key to `~/.ssl`

Double-check your config file (config.json)

Run it!  `feather -e yourenv -z run`