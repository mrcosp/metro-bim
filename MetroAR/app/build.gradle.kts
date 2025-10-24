plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.wepink.metroar"
    compileSdk = 36 // Mantenha 36 ou a mais recente que você tiver

    defaultConfig {
        applicationId = "com.wepink.metroar"
        minSdk = 33
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    packaging {
        resources {
            excludes += "META-INF/native-image/org.mongodb/bson/native-image.properties"
        }
    }

    // --- MUDANÇAS AQUI ---
    compileOptions {
        // 1. Habilite o Core Library Desugaring
        isCoreLibraryDesugaringEnabled = true

        // 2. Mude a versão do Java para 17
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        // 3. Mude a versão do JVM Target para 17
        jvmTarget = "17"
    }
}

dependencies {
    // ... suas dependências existentes ...
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    implementation("com.google.android.material:material:1.12.0")
    implementation("com.google.android.gms:play-services-location:21.3.0")
    implementation("org.mongodb:mongodb-driver-sync:5.1.2")

    // --- ADIÇÃO AQUI ---
    // 4. Adicione a biblioteca de desugaring
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.4")
}


