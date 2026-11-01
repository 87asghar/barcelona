package com.asghar.barcawall;

import android.app.WallpaperManager;
import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Arrays;

public class WallpaperWorker extends Worker {
    static final String BASE = "https://87asghar.github.io/barcelona/wallpapers/";

    public WallpaperWorker(@NonNull Context ctx, @NonNull WorkerParameters p) { super(ctx, p); }

    @NonNull @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        SharedPreferences prefs = ctx.getSharedPreferences("cfg", Context.MODE_PRIVATE);
        String design = prefs.getString("design", "d3-stripes");
        int target = prefs.getInt("target", 0); // 0 = الاثنين، 1 = الرئيسية، 2 = القفل
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(BASE + design + ".png?t=" + System.currentTimeMillis()).openConnection();
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            if (c.getResponseCode() != 200) return Result.retry();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (InputStream in = c.getInputStream()) {
                byte[] buf = new byte[16384];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            byte[] data = out.toByteArray();
            String key = design + ":" + target + ":" + Arrays.hashCode(data);
            if (key.equals(prefs.getString("last", ""))) return Result.success(); // الصورة ما تغيرت
            int flags = target == 1 ? WallpaperManager.FLAG_SYSTEM
                    : target == 2 ? WallpaperManager.FLAG_LOCK
                    : WallpaperManager.FLAG_SYSTEM | WallpaperManager.FLAG_LOCK;
            WallpaperManager.getInstance(ctx).setStream(new ByteArrayInputStream(data), null, true, flags);
            prefs.edit().putString("last", key).apply();
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }
}
