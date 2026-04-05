pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/salomegalvez45695-cyber/Pryeba-Galleta.git', branch: 'main'
            }
        }
        stage('Build') {
            steps {
                echo 'Construyendo el proyecto...'
            }
        }
    }
}