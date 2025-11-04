package com.wepink.metroar

import android.os.Bundle
import android.util.Log
import android.widget.ImageButton
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import io.github.sceneview.ar.ARSceneView
import io.github.sceneview.ar.node.ARModelNode
import io.github.sceneview.ar.node.AnchorNode
import io.github.sceneview.math.Position

class ARActivity : AppCompatActivity() {

    private lateinit var arSceneView: ARSceneView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ar)

        // Obtém a referência da cena AR
        arSceneView = findViewById(R.id.arSceneView)

        // Botão de voltar
        findViewById<ImageButton>(R.id.btnBack).setOnClickListener {
            finish()
        }

        try {
            // Ativa a renderização dos planos detectados
            arSceneView.planeRenderer.isVisible = true

            // Evento de toque: adiciona um cubo no plano tocado
            arSceneView.onTouchAr = { hitResult, _ ->
                try {
                    // Cria um anchor onde o usuário tocou
                    val anchorNode = AnchorNode(arSceneView.engine, hitResult.createAnchor())

                    // Cria um modelo 3D (cube.glb)
                    val modelNode = ARModelNode(
                        engine = arSceneView.engine,
                        modelFileLocation = "models/cube.glb",
                        scaleToUnits = 0.1f,
                        centerOrigin = Position(0.0f, 0.05f, 0.0f)
                    )

                    // Adiciona o modelo ao anchor
                    anchorNode.addChildNode(modelNode)

                    // Adiciona o anchor à cena
                    arSceneView.addChildNode(anchorNode)

                    Toast.makeText(this, "Cubo adicionado!", Toast.LENGTH_SHORT).show()

                } catch (e: Exception) {
                    Log.e("ARActivity", "Erro ao adicionar cubo", e)
                    Toast.makeText(this, "Falha ao adicionar cubo: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }

        } catch (e: Exception) {
            Log.e("ARActivity", "Erro ao iniciar AR", e)
            Toast.makeText(this, "Falha ao inicializar AR: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        arSceneView.destroy()
    }
}