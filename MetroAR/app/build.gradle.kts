plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

repositories {
    google()
    mavenCentral()
    maven { url = uri("https://jitpack.io") }

    maven { url = uri("https://github.com/SceneView/maven-repo/raw/main/") }
    maven { url = uri("https://raw.githubusercontent.com/SceneView/maven-repo/main/") }
}

android {
    namespace = "com.wepink.metroar"
    compileSdk = 36

    buildFeatures {
        viewBinding = true
    }

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
            // REMOVIDO: Exclusão de arquivos BSON/Mongo (Não precisamos mais disso)
        }
    }

    // --- CONFIGURAÇÃO JAVA/KOTLIN (Mantenha para compatibilidade) ---
    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // --- DEPENDÊNCIAS ANDROIDX/GMS (Permanece) ---
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.constraintlayout)
    implementation("com.google.android.material:material:1.12.0")

    // Câmera X (Permanece)
    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)

    // Localização (Permanece)
    implementation("com.google.android.gms:play-services-location:21.3.0")

    // --- DEPENDÊNCIAS DE REDE (RETROFIT & COROUTINES) ---

    // CLIENTE HTTP PRINCIPAL
    implementation("com.squareup.retrofit2:retrofit:2.9.0")

    // CONVERSOR JSON (GSON)
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")

    // OKHTTP (Para gerenciar a rede)
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    implementation("androidx.gridlayout:gridlayout:1.0.0")

    // COROUTINES (Para código assíncrono)
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // DESUGARING (Permanece)
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.4")

    // ARSceneview for augmented reality capabilities
    implementation("io.github.sceneview:arsceneview:0.10.0")

// REMOVIDO: implementacao do mongodb-driver-sync
    // REMOVIDO: implementacao do org.mongodb:bson

    // --- TESTES ---
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}