(function () {
  const API = (window.location.origin || 'http://localhost:3000') + '/api/pms';

  document.querySelectorAll('.tab-link').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-link').forEach(function (l) { l.classList.remove('active'); });
      document.getElementById(a.dataset.tab).classList.add('active');
      a.classList.add('active');
      if (a.dataset.tab === 'dashboard') loadDashboard();
    });
  });

  function tenantId() { return document.getElementById('tenantId').value || 'tenant-1'; }

  function gatherSettings() {
    const o = { tenant_id: tenantId() };
    ['pms_provider','pms_fail_mode','pms_unknown_mode','pms_session_timeout_minutes',
     'pms_db_host','pms_db_port','pms_db_user','pms_db_password','pms_db_database',
     'pms_sql_table','pms_sql_room_column','pms_sql_name_column','pms_sql_tc_column','pms_sql_passport_column',
     'pms_sql_checkin_column','pms_sql_checkout_column','pms_sql_status_column','pms_sql_inhouse_value','pms_sql_external_ref_column',
     'pms_api_url','pms_api_key'].forEach(function (k) {
      const el = document.getElementById(k);
      if (el && el.value) o[k] = el.type === 'number' ? parseInt(el.value, 10) : el.value;
    });
    return o;
  }

  document.getElementById('btnSave').addEventListener('click', function () {
    fetch(API + '/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gatherSettings()) })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        document.getElementById('testResult').textContent = JSON.stringify(data, null, 2);
      })
      .catch(function (err) {
        document.getElementById('testResult').textContent = 'Hata: ' + err.message;
      });
  });

  document.getElementById('btnTest').addEventListener('click', function () {
    document.getElementById('btnSave').click();
    setTimeout(function () {
      fetch(API + '/test-connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenantId() }) })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          document.getElementById('testResult').textContent = JSON.stringify(data, null, 2);
        })
        .catch(function (err) {
          document.getElementById('testResult').textContent = 'Hata: ' + err.message;
        });
    }, 300);
  });

  document.getElementById('btnVerify').addEventListener('click', function () {
    var body = { tenant_id: tenantId(), room_number: document.getElementById('testRoom').value, identity_hash: document.getElementById('testIdentityHash').value };
    fetch(API + '/test-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        document.getElementById('verifyResult').textContent = JSON.stringify(data, null, 2);
      })
      .catch(function (err) {
        document.getElementById('verifyResult').textContent = 'Hata: ' + err.message;
      });
  });

  function loadDashboard() {
    fetch(API + '/dashboard?tenant_id=' + encodeURIComponent(tenantId()))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var c = data.cards || {};
        document.getElementById('dashboardCards').innerHTML = [
          ['Provider', c.provider || '-'],
          ['Online', c.online ? 'Evet' : 'Hayır'],
          ['Circuit', c.circuitOpen ? 'Açık' : 'Kapalı'],
          ['Fail Mode', c.failMode],
          ['Unknown Mode', c.unknownMode],
          ['Avg Latency', (c.avgLatency || 0) + ' ms'],
          ['Cache Hit %', (c.cacheHitRate || 0) + '%'],
          ['Doğrulama (24h)', c.verificationsLast24h || 0],
        ].map(function (x) { return '<div class="card"><div class="val">' + x[1] + '</div><div>' + x[0] + '</div></div>'; }).join('');
        var rows = (data.verifications || []).map(function (v) {
          return '<tr><td>' + v.room_number + '</td><td>' + v.status + '</td><td>' + v.provider + '</td><td>' + v.cache + '</td><td>' + v.latency_ms + ' ms</td><td>' + v.created_at + '</td></tr>';
        }).join('');
        document.getElementById('verificationTable').innerHTML = rows || '<tr><td colspan="6">Kayıt yok</td></tr>';
        var j = data.jobStatus || {};
        document.getElementById('jobStatus').textContent = 'Son çalışma: ' + (j.lastRunAt || '-') + ' | Kapatılan: ' + (j.lastRunCount || 0) + ' | Hata: ' + (j.lastError || '-');
      })
      .catch(function (err) {
        document.getElementById('dashboardCards').innerHTML = '<div class="card">Hata: ' + err.message + '</div>';
      });
  }
})();
