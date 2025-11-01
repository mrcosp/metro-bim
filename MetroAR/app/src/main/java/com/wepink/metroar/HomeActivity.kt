package com.wepink.metroar

import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import com.wepink.metroar.GaleriaActivity

class HomeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        val btnProjects = findViewById<LinearLayout>(R.id.btnProjects)
        val btnGallery = findViewById<LinearLayout>(R.id.btnGallery)

        // Ir para LoginActivity (ou outra que represente "Projetos")
        btnProjects.setOnClickListener {
            val intent = Intent(this, LoginActivity::class.java)
            startActivity(intent)
        }

        // Ir para GaleriaActivity
        btnGallery.setOnClickListener {
            val intent = Intent(this, GaleriaActivity::class.java)
            startActivity(intent)
        }
    }
}