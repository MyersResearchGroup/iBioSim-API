FROM geneticlogiclab/ibiosim:snapshot

LABEL base_image="geneticlogiclab/ibiosim"
LABEL version="1.0.0"
LABEL software="iBioSim-API"
LABEL software.version="1.0.0"
LABEL about.summary="API for SBOLCanvas/SynBioHub communication with iBioSim"
LABEL about.home="https://github.com/MyersResearchGroup/iBioSim"
LABEL about.documentation="https://github.com/MyersResearchGroup/iBioSim"
LABEL about.license_file="https://github.com/MyersResearchGroup/iBioSim/blob/master/LICENSE.txt"
LABEL about.license="Apache-2.0"
LABEL about.tags="kinetic modeling,dynamical simulation,systems biology,biochemical networks,SBML,SED-ML,COMBINE,OMEX,BioSimulators"
LABEL maintainer="Chris Myers <chris.myers@colorado.edu>"

# add iBioSim binaries to executable path
ENV PATH="/iBioSim/bin:${PATH}"

# Install requirements
RUN apt-get update --fix-missing

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

EXPOSE 4000

ENTRYPOINT [ "npm", "start" ]
