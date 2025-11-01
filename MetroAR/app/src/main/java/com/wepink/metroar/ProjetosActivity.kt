package com.wepink.metroar

import android.os.Bundle
import android.widget.ImageButton
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class ProjetosActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_projetos)

        val btnAddProject = findViewById<ImageButton>(R.id.btnAddProject)
        val btnHome = findViewById<ImageButton>(R.id.btnHome)
        val btnGallery = findViewById<ImageButton>(R.id.btnGallery)

        btnAddProject.setOnClickListener {
            Toast.makeText(this, "Novo projeto criado!", Toast.LENGTH_SHORT).show()
        }

        btnHome.setOnClickListener {
            finish() // volta pra tela anterior
        }

        btnGallery.setOnClickListener {
            Toast.makeText(this, "Abrir galeria", Toast.LENGTH_SHORT).show()
        }
    }
}