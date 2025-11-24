package com.wepink.metroar

data class ImageResponse(
    val id: String,
    val nome_da_obra: String,
    val descricao: String,
    val criado_em: String,
    val contentType: String,
    val base64: String
)