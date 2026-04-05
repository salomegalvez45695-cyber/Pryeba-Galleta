pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/TU_USUARIO/TU_REPOSITORIO.git', branch: 'main'
            }
        }
        stage('Build') {
            steps {
                echo 'Construyendo el proyecto...'
            }
        }
    }
}