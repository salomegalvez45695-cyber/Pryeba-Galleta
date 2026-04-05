pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/salomegalvez45695-cyber/Pryeba-Galleta.git', branch: 'main'
            }
        }
        
        stage('Verificar archivos') {
            steps {
                echo '=== Verificando archivos del proyecto ==='
                bat 'dir'
            }
        }
        
        stage('Crear respaldo') {
            steps {
                echo '=== Creando archivo ZIP ==='
                bat 'powershell Compress-Archive -Path index.html, script.js, style.css, Jenkinsfile -DestinationPath respaldo.zip -Force'
                echo '✅ Respaldo creado: respaldo.zip'
            }
        }
        
        stage('Mostrar información') {
            steps {
                echo '=== Información del proyecto ==='
                bat 'dir respaldo.zip'
                echo '✅ Pipeline completado con éxito!'
            }
        }
    }
    
    post {
        always {
            echo '=== Pipeline finalizado ==='
        }
        success {
            echo '🎉 Todo funcionó correctamente!'
        }
        failure {
            echo '❌ Algo salió mal. Revisa los logs.'
        }
    }
}