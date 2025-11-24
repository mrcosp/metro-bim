package com.wepink.metroar

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface ApiService {

    // Upload de captura (Android)
    @POST("/api/captures/upload")
    suspend fun uploadCapture(@Body request: CaptureRequest): Response<ApiResponse>

    // Lista todas as pastas existentes
    @GET("/api/folders")
    suspend fun getFolders(): Response<List<FolderResponse>>

    // Lista todas as imagens (com base64) dentro de uma pasta específica
    @GET("folder/{folderName}")
    suspend fun getImagesFromFolder(@Path("folderName") folderName: String): Response<List<ImageResponse>>

    @POST("/create-folder")
    suspend fun createFolder(@Body request: FolderRequest): Response<DefaultResponse>
}