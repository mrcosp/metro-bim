package com.wepink.metroar

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import android.widget.ImageButton
import io.github.sceneview.ar.ArSceneView
import io.github.sceneview.ar.node.ArModelNode
import io.github.sceneview.math.Position
import com.google.ar.core.Anchor

class ARActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ar)

        val arSceneView = findViewById<ArSceneView>(R.id.arSceneView)
        val btnAR = findViewById<ImageButton>(R.id.btnAR)

        val modelNode = ArModelNode(arSceneView.engine).apply {
            loadModelGlbAsync("models/cube.glb")
            isVisible = false
            isEditable = true
        }

        arSceneView.addChild(modelNode)

        arSceneView.onTapAr = { hitResult, _ ->
            try {
                val anchor: Anchor = hitResult.createAnchor()
                modelNode.anchor = anchor
                modelNode.isVisible = true
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // Botão para voltar à câmera
        btnAR.setOnClickListener {
            val intent = Intent(this, CameraActivity::class.java)
            startActivity(intent)
            finish()
        }
    }
}