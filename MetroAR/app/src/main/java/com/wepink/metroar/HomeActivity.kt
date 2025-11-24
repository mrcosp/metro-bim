package com.wepink.metroar

import android.content.Intent
import android.os.Bundle
import android.widget.ImageButton
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity

class HomeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        val btnProjects = findViewById<LinearLayout>(R.id.btnProjects)
        val btnGallery = findViewById<LinearLayout>(R.id.btnGallery)
        val btnSettings = findViewById<ImageButton>(R.id.btnSettings)

        // Ir para ProjetosActivity
        btnProjects.setOnClickListener {
            startActivity(Intent(this, ProjetosActivity::class.java))
        }

        // Abrir CameraActivity vindo da Home
        btnGallery.setOnClickListener {
            val intent = Intent(this, CameraActivity::class.java)
            intent.putExtra("openedFrom", "home")
            startActivity(intent)
        }

        // Ir para Configurações
        btnSettings.setOnClickListener {
            startActivity(Intent(this, ConfiguracoesActivity::class.java))
        }
    }
}