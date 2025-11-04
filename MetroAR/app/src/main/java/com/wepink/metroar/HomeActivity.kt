package com.wepink.metroar

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity

class HomeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        val btnProjects = findViewById<LinearLayout>(R.id.btnProjects)
        val btnGallery = findViewById<LinearLayout>(R.id.btnGallery)
        val btnCamera = findViewById<LinearLayout>(R.id.btnCamera)

        // Ir para LoginActivity (ou outra que represente "Projetos")
        btnProjects.setOnClickListener {
            val intent = Intent(this, ProjetosActivity::class.java)
            startActivity(intent)
        }

        // Ir para GaleriaActivity
        btnGallery.setOnClickListener {
            val intent = Intent(this, GaleriaActivity::class.java)
            startActivity(intent)
        }

        // Ir para CameraActivity
        btnCamera.setOnClickListener {
            val intent = Intent(this, CameraActivity::class.java)
            startActivity(intent)
        }

        val btnAR = findViewById<LinearLayout>(R.id.btnAR)
        btnAR.setOnClickListener {
            startActivity(Intent(this, ARActivity::class.java))
        }
    }
}