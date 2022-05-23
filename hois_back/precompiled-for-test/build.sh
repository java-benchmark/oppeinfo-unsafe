cd ..
JAVA_HOME=/opt/jdk1.8.0 sh gradlew clean assemble
cp build/libs/hois_back-0.0.1-SNAPSHOT.jar precompiled-for-test
