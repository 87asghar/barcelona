package com.asghar.barcawall;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

public class MainActivity extends Activity {
    static final String[] IDS = {"d3-stripes", "d1-aurora", "d2-midnight", "d4-night", "d5-light", "d6-dusk"};
    static final String[] NAMES = {"خطوط", "أورورا", "منتصف الليل", "ليلة الملعب", "فاتح هادي", "غروب"};
    static final String[] TARGETS = {"الرئيسية + القفل", "الرئيسية فقط", "القفل فقط"};

    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences("cfg", MODE_PRIVATE);
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(pad, pad * 2, pad, pad);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        TextView title = new TextView(this);
        title.setText("خلفية برشلونة التلقائية");
        title.setTextSize(22);
        root.addView(title);

        Spinner design = new Spinner(this);
        design.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, NAMES));
        design.setSelection(indexOf(prefs.getString("design", IDS[0])));
        root.addView(design);

        Spinner target = new Spinner(this);
        target.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, TARGETS));
        target.setSelection(prefs.getInt("target", 0));
        root.addView(target);

        Button start = new Button(this);
        start.setText("تفعيل التحديث التلقائي (كل 15 دقيقة)");
        start.setOnClickListener(v -> {
            prefs.edit().putString("design", IDS[design.getSelectedItemPosition()])
                    .putInt("target", target.getSelectedItemPosition()).putString("last", "").apply();
            Constraints net = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
            WorkManager wm = WorkManager.getInstance(this);
            wm.enqueueUniquePeriodicWork("barca", ExistingPeriodicWorkPolicy.UPDATE,
                    new PeriodicWorkRequest.Builder(WallpaperWorker.class, 15, TimeUnit.MINUTES).setConstraints(net).build());
            wm.enqueueUniqueWork("barca-now", ExistingWorkPolicy.REPLACE,
                    new OneTimeWorkRequest.Builder(WallpaperWorker.class).setConstraints(net).build());
            Toast.makeText(this, "تم التفعيل، الخلفية تتغير خلال لحظات", Toast.LENGTH_LONG).show();
        });
        root.addView(start);

        Button stop = new Button(this);
        stop.setText("إيقاف التحديث");
        stop.setOnClickListener(v -> {
            WorkManager.getInstance(this).cancelUniqueWork("barca");
            Toast.makeText(this, "تم الإيقاف", Toast.LENGTH_SHORT).show();
        });
        root.addView(stop);

        Button battery = new Button(this);
        battery.setText("اسمح للتطبيق يشتغل بالخلفية (مهم)");
        battery.setOnClickListener(v -> {
            try {
                startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName())));
            } catch (Exception e) {
                startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
            }
        });
        root.addView(battery);

        setContentView(root);
    }

    private static int indexOf(String id) {
        for (int i = 0; i < IDS.length; i++) if (IDS[i].equals(id)) return i;
        return 0;
    }
}
