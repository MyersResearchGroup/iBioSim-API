FROM geneticlogiclab/ibiosim:snapshot

# add iBioSim binaries to executable path
ENV PATH="/iBioSim/bin:${PATH}"

# install Node 16
RUN apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

# copy over application code
WORKDIR /express_app
COPY . .

# create directories we'll need
RUN mkdir /tmp/uploads

# install deps
RUN npm install

ENTRYPOINT [ "npm", "start" ]