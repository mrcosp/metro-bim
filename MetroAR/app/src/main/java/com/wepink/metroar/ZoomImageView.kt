package com.wepink.metroar

import android.content.Context
import android.graphics.Matrix
import android.graphics.PointF
import android.util.AttributeSet
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import androidx.appcompat.widget.AppCompatImageView
import kotlin.math.min

class ZoomImageView(context: Context, attrs: AttributeSet?) : AppCompatImageView(context, attrs) {

    private val matrixValues = FloatArray(9)
    private val imageMatrixInternal = Matrix()

    private var mode = NONE
    private var lastPoint = PointF()

    private var minScale = 1f
    private var maxScale = 4f
    private var initialScale = 1f

    private val scaleDetector = ScaleGestureDetector(context, ScaleListener())
    private val gestureDetector = GestureDetector(context, GestureListener())

    init {
        super.setClickable(true)
        scaleType = ScaleType.MATRIX
        imageMatrix = imageMatrixInternal
    }

    override fun setImageBitmap(bm: android.graphics.Bitmap?) {
        super.setImageBitmap(bm)
        post { fitImageToView() }
    }

    private fun fitImageToView() {
        if (drawable == null) return

        val viewWidth = width.toFloat()
        val viewHeight = height.toFloat()
        val drawableWidth = drawable.intrinsicWidth.toFloat()
        val drawableHeight = drawable.intrinsicHeight.toFloat()

        // Calcula o scale inicial
        val scale = min(viewWidth / drawableWidth, viewHeight / drawableHeight)
        initialScale = scale
        minScale = scale  // ← IMPORTANTE
        maxScale = scale * 4f

        imageMatrixInternal.setScale(scale, scale)

        val dx = (viewWidth - drawableWidth * scale) / 2
        val dy = (viewHeight - drawableHeight * scale) / 2

        imageMatrixInternal.postTranslate(dx, dy)

        imageMatrix = imageMatrixInternal
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        gestureDetector.onTouchEvent(event)
        scaleDetector.onTouchEvent(event)

        val current = PointF(event.x, event.y)

        when (event.action and MotionEvent.ACTION_MASK) {
            MotionEvent.ACTION_DOWN -> {
                lastPoint.set(current)
                mode = DRAG
            }

            MotionEvent.ACTION_MOVE -> {
                if (mode == DRAG) {
                    val dx = current.x - lastPoint.x
                    val dy = current.y - lastPoint.y

                    imageMatrixInternal.postTranslate(dx, dy)
                    fixTranslation()
                    lastPoint.set(current.x, current.y)
                }
            }

            MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> {
                mode = NONE
            }
        }

        imageMatrix = imageMatrixInternal
        return true
    }

    private fun fixTranslation() {
        imageMatrixInternal.getValues(matrixValues)

        val transX = matrixValues[Matrix.MTRANS_X]
        val transY = matrixValues[Matrix.MTRANS_Y]

        val currentScale = matrixValues[Matrix.MSCALE_X]
        val drawableWidth = drawable.intrinsicWidth * currentScale
        val drawableHeight = drawable.intrinsicHeight * currentScale

        val viewWidth = width.toFloat()
        val viewHeight = height.toFloat()

        var deltaX = 0f
        var deltaY = 0f

        // X
        if (drawableWidth <= viewWidth) {
            deltaX = viewWidth / 2f - (transX + drawableWidth / 2f)
        } else {
            if (transX > 0) deltaX = -transX
            if (transX + drawableWidth < viewWidth) deltaX = viewWidth - (transX + drawableWidth)
        }

        // Y
        if (drawableHeight <= viewHeight) {
            deltaY = viewHeight / 2f - (transY + drawableHeight / 2f)
        } else {
            if (transY > 0) deltaY = -transY
            if (transY + drawableHeight < viewHeight) deltaY = viewHeight - (transY + drawableHeight)
        }

        imageMatrixInternal.postTranslate(deltaX, deltaY)
    }

    private inner class ScaleListener : ScaleGestureDetector.SimpleOnScaleGestureListener() {
        override fun onScale(detector: ScaleGestureDetector): Boolean {
            val scaleFactor = detector.scaleFactor

            imageMatrixInternal.getValues(matrixValues)
            var currentScale = matrixValues[Matrix.MSCALE_X]

            var newScale = currentScale * scaleFactor

            // clamp
            if (newScale < minScale) newScale = minScale
            if (newScale > maxScale) newScale = maxScale

            val adjustedFactor = newScale / currentScale

            imageMatrixInternal.postScale(adjustedFactor, adjustedFactor, detector.focusX, detector.focusY)
            fixTranslation()
            return true
        }
    }

    private inner class GestureListener : GestureDetector.SimpleOnGestureListener() {

        override fun onDoubleTap(e: MotionEvent): Boolean {
            imageMatrixInternal.getValues(matrixValues)
            val currentScale = matrixValues[Matrix.MSCALE_X]

            val targetScale =
                if (currentScale < initialScale * 1.5f)
                    initialScale * 2f  // zoom in
                else
                    initialScale        // volta ao tamanho original

            val factor = targetScale / currentScale

            imageMatrixInternal.postScale(factor, factor, e.x, e.y)
            fixTranslation()
            return true
        }
    }

    companion object {
        private const val NONE = 0
        private const val DRAG = 1
    }
}