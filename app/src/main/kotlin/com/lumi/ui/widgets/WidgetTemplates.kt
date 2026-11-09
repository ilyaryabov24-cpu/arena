package com.lumi.ui.widgets

import com.lumi.ui.core.model.ClipboardAlign
import com.lumi.ui.core.model.WidgetDoc
import com.lumi.ui.core.model.WidgetElement
import com.lumi.ui.core.model.WidgetElementType
import com.lumi.ui.core.model.WidgetStyle

/**
 * The widget library. Every entry is a real [WidgetDoc] the renderer can draw and the editor can
 * open and modify — not a picture of a widget.
 */
object WidgetTemplates {

    data class Template(
        val key: String,
        val category: String,
        val name: String,
        val description: String,
        val widthCells: Int,
        val heightCells: Int,
        val build: () -> WidgetDoc,
    )

    val categories = listOf("clock", "info", "large")

    val all: List<Template> = listOf(
        // ---------------------------------- clocks ----------------------------------
        Template("clock_digital", "clock", "Digital clock", "Large minimal digits with seconds", 4, 2) {
            doc("Digital", listOf(
                el(WidgetElementType.CLOCK, x = 0.5f, y = 0.42f, w = 0.9f, h = 0.42f, size = 46f, weight = 300, format = "HH:mm", letter = -1.5f),
                el(WidgetElementType.DATE, x = 0.5f, y = 0.78f, w = 0.9f, h = 0.2f, size = 14f, weight = 500, format = "EEEE, d MMMM"),
            ))
        },
        Template("clock_minimal", "clock", "Minimal", "Thin type, wide tracking", 4, 2) {
            doc("Minimal", listOf(
                el(WidgetElementType.CLOCK, x = 0.5f, y = 0.5f, w = 0.9f, h = 0.5f, size = 40f, weight = 200, format = "HH:mm", letter = 6f),
            ))
        },
        Template("clock_analog", "clock", "Analog", "Hands drawn from live time", 2, 2) {
            doc("Analog", listOf(
                WidgetElement(name = "Analog", type = WidgetElementType.SHAPE, shapeKind = "analog_clock", x = 0.5f, y = 0.5f, width = 0.8f, height = 0.8f, cornerDp = 999f, color = 0x22FFFFFF),
            ))
        },
        Template("clock_big", "clock", "Big digits", "Statement clock, iOS-inspired", 4, 3) {
            doc("Big", listOf(
                el(WidgetElementType.CLOCK, x = 0.08f, y = 0.24f, w = 0.84f, h = 0.32f, size = 64f, weight = 300, format = "HH:mm", letter = -2.2f, align = ClipboardAlign.START),
                el(WidgetElementType.DATE, x = 0.08f, y = 0.5f, w = 0.84f, h = 0.16f, size = 15f, weight = 500, format = "EEEE, d MMMM", align = ClipboardAlign.START),
                el(WidgetElementType.BATTERY, x = 0.5f, y = 0.82f, w = 0.8f, h = 0.16f, size = 16f),
            ))
        },
        Template("clock_vertical", "clock", "Vertical", "Stacked hours and minutes", 2, 3) {
            doc("Vertical", listOf(
                el(WidgetElementType.CLOCK, x = 0.42f, y = 0.28f, w = 0.8f, h = 0.24f, size = 34f, weight = 400, format = "HH"),
                el(WidgetElementType.CLOCK, x = 0.58f, y = 0.56f, w = 0.8f, h = 0.24f, size = 34f, weight = 200, format = "mm"),
                el(WidgetElementType.DATE, x = 0.5f, y = 0.82f, w = 0.9f, h = 0.14f, size = 11f, format = "EE dd"),
            ))
        },
        Template("clock_horizontal", "clock", "Horizontal", "Hours and minutes side by side with a divider", 4, 1) {
            doc("Horizontal", listOf(
                el(WidgetElementType.CLOCK, x = 0.3f, y = 0.5f, w = 0.3f, h = 0.7f, size = 32f, weight = 500, format = "HH"),
                el(WidgetElementType.TEXT, x = 0.5f, y = 0.5f, w = 0.08f, h = 0.7f, size = 26f, weight = 300, text = ":"),
                el(WidgetElementType.CLOCK, x = 0.7f, y = 0.5f, w = 0.3f, h = 0.7f, size = 32f, weight = 300, format = "mm"),
            ))
        },
        Template("clock_date", "clock", "Clock + date", "Compact clock with full date", 4, 2) {
            doc("Clock + date", listOf(
                el(WidgetElementType.CLOCK, x = 0.5f, y = 0.34f, w = 0.9f, h = 0.34f, size = 34f, weight = 400, format = "HH:mm"),
                el(WidgetElementType.DATE, x = 0.5f, y = 0.7f, w = 0.9f, h = 0.16f, size = 12f, format = "EEE, d MMM"),
                el(WidgetElementType.CALENDAR, x = 0.5f, y = 0.9f, w = 0.9f, h = 0.3f, size = 10f),
            ), heightCells = 3)
        },
        Template("clock_weather", "clock", "Clock + weather", "Time and temperature together", 4, 2) {
            doc("Clock + weather", listOf(
                el(WidgetElementType.CLOCK, x = 0.28f, y = 0.42f, w = 0.5f, h = 0.4f, size = 36f, weight = 400, format = "HH:mm", align = ClipboardAlign.START),
                el(WidgetElementType.WEATHER, x = 0.78f, y = 0.4f, w = 0.36f, h = 0.4f, size = 30f, weight = 300),
            ))
        },
        Template("clock_gradient", "clock", "Gradient clock", "Gradient-filled typography", 4, 2) {
            doc("Gradient", listOf(
                el(WidgetElementType.CLOCK, x = 0.5f, y = 0.45f, w = 0.9f, h = 0.5f, size = 44f, weight = 600, format = "HH:mm", gradient = true, color = 0xFF7FA9FF, color2 = 0xFFC0A6FF),
            ))
        },
        Template("clock_glass", "clock", "Glass clock", "Barely-there glass panel", 4, 2) {
            doc("Glass", listOf(
                el(WidgetElementType.CLOCK, x = 0.5f, y = 0.42f, w = 0.9f, h = 0.4f, size = 40f, weight = 300, format = "HH:mm"),
                el(WidgetElementType.DATE, x = 0.5f, y = 0.74f, w = 0.9f, h = 0.16f, size = 12f, format = "EEEE"),
            ), style = WidgetStyle(cornerDp = 30f, opacityPercent = 12, blur = 22f, tint = 0xFFFFFFFF, highlight = 0.8f))
        },
        Template("clock_dynamic", "clock", "Dynamic type", "Pulsing animated typography", 4, 2) {
            doc("Dynamic", listOf(
                el(WidgetElementType.CLOCK, x = 0.5f, y = 0.45f, w = 0.9f, h = 0.5f, size = 42f, weight = 700, format = "HH:mm", animated = true),
            ))
        },
        Template("clock_ios", "clock", "iOS style", "Light, airy, left aligned", 4, 2) {
            doc("iOS", listOf(
                el(WidgetElementType.CLOCK, x = 0.09f, y = 0.36f, w = 0.82f, h = 0.36f, size = 42f, weight = 300, format = "HH:mm", align = ClipboardAlign.START, color = 0xFFF3F7FF),
                el(WidgetElementType.DATE, x = 0.09f, y = 0.68f, w = 0.82f, h = 0.16f, size = 13f, weight = 500, format = "EEEE d MMMM", align = ClipboardAlign.START),
            ), style = WidgetStyle(cornerDp = 34f, opacityPercent = 8, blur = 26f, tint = 0xFFFFFFFF, highlight = 0.9f))
        },
        Template("clock_coloros", "clock", "ColorOS style", "Bold, warm accent block", 4, 2) {
            doc("ColorOS", listOf(
                el(WidgetElementType.CLOCK, x = 0.5f, y = 0.36f, w = 0.9f, h = 0.34f, size = 40f, weight = 600, format = "HH:mm"),
                el(WidgetElementType.SHAPE, x = 0.5f, y = 0.72f, w = 0.44f, h = 0.06f, color = 0xFF7FA9FF, corner = 99f),
            ), style = WidgetStyle(cornerDp = 26f, opacityPercent = 26, blur = 18f, gradientSecondary = 0x33FFB27A))
        },
        Template("clock_hyperos", "clock", "HyperOS style", "Spatial depth with soft glow", 4, 2) {
            doc("HyperOS", listOf(
                el(WidgetElementType.CLOCK, x = 0.5f, y = 0.4f, w = 0.9f, h = 0.4f, size = 46f, weight = 200, format = "HH:mm", letter = -1f),
                el(WidgetElementType.DATE, x = 0.5f, y = 0.72f, w = 0.9f, h = 0.14f, size = 11f, format = "EEEE"),
            ), style = WidgetStyle(cornerDp = 32f, opacityPercent = 18, blur = 28f, glow = 0.4f, gradientSecondary = 0x22C0A6FF))
        },

        // ---------------------------------- info ------------------------------------
        Template("info_date", "info", "Date", "Today at a glance", 2, 1) {
            doc("Date", listOf(
                el(WidgetElementType.DATE, x = 0.5f, y = 0.42f, w = 0.9f, h = 0.34f, size = 16f, weight = 600, format = "d MMMM"),
                el(WidgetElementType.DATE, x = 0.5f, y = 0.72f, w = 0.9f, h = 0.2f, size = 10f, weight = 500, format = "EEEE"),
            ))
        },
        Template("info_weekday", "info", "Weekday", "Day name with tinted accent", 2, 1) {
            doc("Weekday", listOf(
                el(WidgetElementType.DATE, x = 0.5f, y = 0.5f, w = 0.9f, h = 0.6f, size = 18f, weight = 500, format = "EEEE", gradient = true, color = 0xFF7FA9FF, color2 = 0xFF79E8C6),
            ))
        },
        Template("info_battery", "info", "Battery", "Live charge level", 2, 1) {
            doc("Battery", listOf(
                el(WidgetElementType.BATTERY, x = 0.5f, y = 0.5f, w = 0.7f, h = 0.5f, size = 22f, weight = 500),
            ))
        },
        Template("info_weather", "info", "Weather", "Manual temperature card", 2, 1) {
            doc("Weather", listOf(
                el(WidgetElementType.WEATHER, x = 0.4f, y = 0.5f, w = 0.4f, h = 0.5f, size = 26f, weight = 300),
                el(WidgetElementType.TEXT, x = 0.72f, y = 0.5f, w = 0.4f, h = 0.3f, size = 9f, weight = 500, text = "Set in Widget Studio"),
            ))
        },
        Template("info_calendar", "info", "Calendar", "Month grid with today", 4, 2) {
            doc("Calendar", listOf(
                el(WidgetElementType.CALENDAR, x = 0.5f, y = 0.5f, w = 0.9f, h = 0.9f, size = 11f, align = ClipboardAlign.START),
            ))
        },
        Template("info_music", "info", "Music", "Now playing card", 4, 1) {
            doc("Music", listOf(
                el(WidgetElementType.MUSIC, x = 0.5f, y = 0.5f, w = 0.9f, h = 0.6f, size = 16f, text = "Nothing playing", align = ClipboardAlign.START),
            ))
        },
        Template("info_quick", "info", "Quick actions", "Three-tap shortcut row", 4, 1) {
            doc("Quick", listOf(
                el(WidgetElementType.SHAPE, x = 0.14f, y = 0.5f, w = 0.22f, h = 0.62f, corner = 18f, color = 0x33FFFFFF),
                el(WidgetElementType.SHAPE, x = 0.5f, y = 0.5f, w = 0.22f, h = 0.62f, corner = 18f, color = 0x33FFFFFF),
                el(WidgetElementType.SHAPE, x = 0.86f, y = 0.5f, w = 0.22f, h = 0.62f, corner = 18f, color = 0x33FFFFFF),
                el(WidgetElementType.TEXT, x = 0.14f, y = 0.5f, w = 0.2f, h = 0.3f, size = 16f, text = "W"),
                el(WidgetElementType.TEXT, x = 0.5f, y = 0.5f, w = 0.2f, h = 0.3f, size = 16f, text = "B"),
                el(WidgetElementType.TEXT, x = 0.86f, y = 0.5f, w = 0.2f, h = 0.3f, size = 16f, text = "F"),
            ))
        },
        Template("info_device", "info", "Device info", "Model and free memory", 4, 1) {
            doc("Device", listOf(
                el(WidgetElementType.TEXT, x = 0.5f, y = 0.36f, w = 0.9f, h = 0.3f, size = 14f, weight = 600, text = "LUMI device"),
                el(WidgetElementType.TEXT, x = 0.5f, y = 0.68f, w = 0.9f, h = 0.24f, size = 10f, weight = 400, text = "Free memory is read live in the preview"),
            ))
        },
        Template("info_text", "info", "Text card", "Your own words", 4, 1) {
            doc("Text card", listOf(
                el(WidgetElementType.CUSTOM_TEXT, x = 0.5f, y = 0.5f, w = 0.9f, h = 0.6f, size = 15f, weight = 400, text = "Anything you want to see on your desktop"),
            ))
        },
        Template("info_search", "info", "Search bar", "Opens the LUMI app search", 4, 1) {
            doc("Search", listOf(
                el(WidgetElementType.SHAPE, x = 0.5f, y = 0.5f, w = 0.94f, h = 0.8f, corner = 99f, color = 0x22FFFFFF),
                el(WidgetElementType.TEXT, x = 0.5f, y = 0.5f, w = 0.8f, h = 0.4f, size = 13f, weight = 400, text = "Search apps", align = ClipboardAlign.START),
            ), style = WidgetStyle(opacityPercent = 0, blur = 0f, paddingDp = 4f))
        },

        // ---------------------------------- large -----------------------------------
        Template("large_clock", "large", "Large clock", "Full-page time with battery", 4, 4) {
            doc("Large clock", listOf(
                el(WidgetElementType.CLOCK, x = 0.5f, y = 0.3f, w = 0.92f, h = 0.3f, size = 76f, weight = 200, format = "HH:mm", letter = -2.5f),
                el(WidgetElementType.DATE, x = 0.5f, y = 0.52f, w = 0.9f, h = 0.12f, size = 15f, weight = 500, format = "EEEE, d MMMM"),
                el(WidgetElementType.BATTERY, x = 0.5f, y = 0.72f, w = 0.8f, h = 0.14f, size = 16f),
                el(WidgetElementType.CALENDAR, x = 0.5f, y = 0.95f, w = 0.9f, h = 0.3f, size = 10f),
            ), style = WidgetStyle(cornerDp = 34f, opacityPercent = 22, blur = 24f))
        },
        Template("large_weather", "large", "Weather card", "Temperature and detail rows", 4, 2) {
            doc("Weather card", listOf(
                el(WidgetElementType.WEATHER, x = 0.22f, y = 0.36f, w = 0.4f, h = 0.4f, size = 40f, weight = 200),
                el(WidgetElementType.TEXT, x = 0.3f, y = 0.7f, w = 0.5f, h = 0.2f, size = 10f, weight = 500, text = "Feels like"),
                el(WidgetElementType.SHAPE, x = 0.5f, y = 0.52f, w = 0.9f, h = 0.02f, corner = 9f, color = 0x22FFFFFF),
                el(WidgetElementType.TEXT, x = 0.75f, y = 0.4f, w = 0.4f, h = 0.2f, size = 11f, weight = 500, text = "Humidity"),
                el(WidgetElementType.TEXT, x = 0.75f, y = 0.62f, w = 0.4f, h = 0.2f, size = 11f, weight = 500, text = "Wind"),
            ), style = WidgetStyle(cornerDp = 30f, opacityPercent = 20, blur = 26f, gradientSecondary = 0x2279E8C6))
        },
        Template("large_player", "large", "Music player", "Album art, title and progress", 4, 2) {
            doc("Player", listOf(
                el(WidgetElementType.IMAGE, x = 0.2f, y = 0.5f, w = 0.32f, h = 0.62f, corner = 18f),
                el(WidgetElementType.MUSIC, x = 0.62f, y = 0.36f, w = 0.66f, h = 0.24f, size = 13f, text = "Nothing playing", align = ClipboardAlign.START),
                el(WidgetElementType.PROGRESS, x = 0.62f, y = 0.62f, w = 0.66f, h = 0.06f, scale = 0.42f),
                el(WidgetElementType.TEXT, x = 0.62f, y = 0.78f, w = 0.66f, h = 0.14f, size = 9f, text = "1:12 / 3:40", align = ClipboardAlign.START),
            ), style = WidgetStyle(cornerDp = 28f, opacityPercent = 26, blur = 22f))
        },
        Template("large_gallery", "large", "Photo gallery", "Your image with a caption", 4, 3) {
            doc("Gallery", listOf(
                el(WidgetElementType.IMAGE, x = 0.5f, y = 0.5f, w = 1f, h = 1f, corner = 26f),
                el(WidgetElementType.TEXT, x = 0.5f, y = 0.9f, w = 0.8f, h = 0.1f, size = 10f, weight = 500, text = "Pick an image in the editor"),
            ), style = WidgetStyle(opacityPercent = 0, blur = 0f, paddingDp = 0f), blurBackground = false)
        },
        Template("large_combo", "large", "Combined info", "Clock, weather and battery in one card", 4, 3) {
            doc("Combined", listOf(
                el(WidgetElementType.CLOCK, x = 0.5f, y = 0.2f, w = 0.9f, h = 0.2f, size = 40f, weight = 300, format = "HH:mm"),
                el(WidgetElementType.DATE, x = 0.5f, y = 0.38f, w = 0.9f, h = 0.1f, size = 11f, format = "EEEE d MMMM"),
                el(WidgetElementType.SHAPE, x = 0.5f, y = 0.52f, w = 0.86f, h = 0.012f, corner = 9f, color = 0x22FFFFFF),
                el(WidgetElementType.WEATHER, x = 0.24f, y = 0.7f, w = 0.3f, h = 0.24f, size = 22f),
                el(WidgetElementType.BATTERY, x = 0.72f, y = 0.7f, w = 0.34f, h = 0.24f, size = 16f),
                el(WidgetElementType.TEXT, x = 0.24f, y = 0.9f, w = 0.3f, h = 0.1f, size = 8f, text = "Weather"),
                el(WidgetElementType.TEXT, x = 0.72f, y = 0.9f, w = 0.3f, h = 0.1f, size = 8f, text = "Battery"),
            ), style = WidgetStyle(cornerDp = 30f, opacityPercent = 24, blur = 24f))
        },
        Template("large_calendar", "large", "Big calendar", "Month view with today highlighted", 4, 3) {
            doc("Calendar", listOf(
                el(WidgetElementType.CALENDAR, x = 0.5f, y = 0.5f, w = 0.92f, h = 0.9f, size = 13f, align = ClipboardAlign.START),
            ))
        },
    )

    fun byKey(key: String): Template? = all.firstOrNull { it.key == key }

    fun blank(): WidgetDoc = doc("New widget", listOf(
        el(WidgetElementType.CLOCK, x = 0.5f, y = 0.45f, w = 0.9f, h = 0.4f, size = 36f, weight = 300, format = "HH:mm"),
    ))

    /* ---------------------------------- helpers --------------------------------- */

    private fun doc(
        name: String,
        elements: List<WidgetElement>,
        style: WidgetStyle = WidgetStyle(),
        heightCells: Int = 2,
        blurBackground: Boolean = true,
    ) = WidgetDoc(
        name = name,
        template = "builtin",
        widthCells = 4,
        heightCells = heightCells,
        style = style,
        elements = elements,
        blurBackground = blurBackground,
    )

    private fun el(
        type: WidgetElementType,
        x: Float,
        y: Float,
        w: Float,
        h: Float,
        size: Float = 24f,
        weight: Int = 400,
        format: String = "",
        text: String = "",
        color: Long = 0xFFFFFFFF,
        color2: Long = 0x00000000,
        corner: Float = 16f,
        gradient: Boolean = false,
        letter: Float = 0f,
        align: ClipboardAlign = ClipboardAlign.CENTER,
        animated: Boolean = false,
        scale: Float = 1f,
    ) = WidgetElement(
        type = type, x = x, y = y, width = w, height = h,
        fontSizeSp = size, fontWeight = weight, format = format, text = text,
        color = color, colorSecondary = color2, cornerDp = corner, gradient = gradient,
        letterSpacing = letter, align = align, animated = animated, scale = scale,
    )
}
