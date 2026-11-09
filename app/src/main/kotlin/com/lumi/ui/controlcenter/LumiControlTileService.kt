package com.lumi.ui.controlcenter

import android.content.Intent
import android.graphics.drawable.Icon
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import com.lumi.ui.MainActivity
import com.lumi.ui.R

/**
 * A genuine Android Quick Settings tile that opens the LUMI studio. Tiles cannot host a whole panel,
 * so this is the honest integration point Android offers.
 */
class LumiControlTileService : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        qsTile?.apply {
            state = Tile.STATE_INACTIVE
            label = getString(R.string.control_tile_label)
            icon = Icon.createWithResource(this@LumiControlTileService, R.drawable.ic_tile_lumi)
            updateTile()
        }
    }

    override fun onClick() {
        super.onClick()
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra(MainActivity.EXTRA_ROUTE, "control")
        }
        startActivityAndCollapseCompat(intent)
    }

    private fun startActivityAndCollapseCompat(intent: Intent) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startActivityAndCollapse(
                android.app.PendingIntent.getActivity(
                    this, 0, intent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
                )
            )
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}
