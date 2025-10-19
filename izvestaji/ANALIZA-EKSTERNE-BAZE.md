# Analiza Eksterne SQLite Baze (MojRacun.db)

**Datum analize:** 19. 10. 2025. 14:35:39
**Lokacija baze:** `D:\ProjektiApp\stambena\baza\MojRacun.db`

---

## 📋 Pregled Tabela

| Tabela | Broj redova | Broj kolona | Indeksi |
|--------|-------------|-------------|---------|
| `android_metadata` | 1 | 1 | 0 |
| `garancije` | 0 | 5 | 0 |
| `kategorije` | 21 | 5 | 0 |
| `prodavci` | 15 | 7 | 0 |
| `racuni` | 15 | 14 | 0 |
| `room_master_table` | 1 | 2 | 0 |

---

## 🗂️ Tabela: `android_metadata`

**Broj redova:** 1

### SQL Definicija

```sql
CREATE TABLE android_metadata (locale TEXT)
```

### Kolone

| # | Naziv | Tip | NOT NULL | Default | Primary Key |
|---|-------|-----|----------|---------|-------------|
| 0 | `locale` | TEXT |  |  |  |

### Uzorak Podataka (prvih 5 redova)

```json
[
  {
    "locale": "en_US"
  }
]
```

---

## 🗂️ Tabela: `garancije`

**Broj redova:** 0

### SQL Definicija

```sql
CREATE TABLE `garancije` (`idGarancija` INTEGER PRIMARY KEY AUTOINCREMENT, `pocetakGar` INTEGER, `krajGar` INTEGER, `nazivGar` TEXT, `racunIdGar` INTEGER)
```

### Kolone

| # | Naziv | Tip | NOT NULL | Default | Primary Key |
|---|-------|-----|----------|---------|-------------|
| 0 | `idGarancija` | INTEGER |  |  | 🔑 |
| 1 | `pocetakGar` | INTEGER |  |  |  |
| 2 | `krajGar` | INTEGER |  |  |  |
| 3 | `nazivGar` | TEXT |  |  |  |
| 4 | `racunIdGar` | INTEGER |  |  |  |

---

## 🗂️ Tabela: `kategorije`

**Broj redova:** 21

### SQL Definicija

```sql
CREATE TABLE `kategorije` (`idKategorija` INTEGER PRIMARY KEY AUTOINCREMENT, `idKat` BLOB, `bojaKat` TEXT, `nazivKat` TEXT, `racunIdKat` INTEGER)
```

### Kolone

| # | Naziv | Tip | NOT NULL | Default | Primary Key |
|---|-------|-----|----------|---------|-------------|
| 0 | `idKategorija` | INTEGER |  |  | 🔑 |
| 1 | `idKat` | BLOB |  |  |  |
| 2 | `bojaKat` | TEXT |  |  |  |
| 3 | `nazivKat` | TEXT |  |  |  |
| 4 | `racunIdKat` | INTEGER |  |  |  |

### Uzorak Podataka (prvih 5 redova)

```json
[
  {
    "idKategorija": 1,
    "idKat": {
      "type": "Buffer",
      "data": [
        207,
        204,
        82,
        39,
        148,
        6,
        79,
        130,
        136,
        142,
        183,
        31,
        121,
        129,
        164,
        102
      ]
    },
    "bojaKat": "#FFFFFB25",
    "nazivKat": "Deca šoping",
    "racunIdKat": null
  },
  {
    "idKategorija": 2,
    "idKat": {
      "type": "Buffer",
      "data": [
        114,
        255,
        234,
        119,
        244,
        236,
        71,
        247,
        167,
        102,
        57,
        24,
        30,
        146,
        32,
        147
      ]
    },
    "bojaKat": "#FFFF1C2B",
    "nazivKat": "Namirnice ",
    "racunIdKat": null
  },
  {
    "idKategorija": 3,
    "idKat": {
      "type": "Buffer",
      "data": [
        241,
        113,
        140,
        107,
        151,
        28,
        70,
        215,
        129,
        97,
        72,
        40,
        0,
        13,
        201,
        228
      ]
    },
    "bojaKat": "#FF74FF22",
    "nazivKat": "Apoteka ",
    "racunIdKat": null
  },
  {
    "idKategorija": 4,
    "idKat": {
      "type": "Buffer",
      "data": [
        207,
        204,
        82,
        39,
        148,
        6,
        79,
        130,
        136,
        142,
        183,
        31,
        121,
        129,
        164,
        102
      ]
    },
    "bojaKat": "#FFFFFB25",
    "nazivKat": "Deca šoping",
    "racunIdKat": 3
  },
  {
    "idKategorija": 5,
    "idKat": {
      "type": "Buffer",
      "data": [
        207,
        204,
        82,
        39,
        148,
        6,
        79,
        130,
        136,
        142,
        183,
        31,
        121,
        129,
        164,
        102
      ]
    },
    "bojaKat": "#FFFFFB25",
    "nazivKat": "Deca šoping",
    "racunIdKat": 2
  }
]
```

---

## 🗂️ Tabela: `prodavci`

**Broj redova:** 15

### SQL Definicija

```sql
CREATE TABLE `prodavci` (`idProd` INTEGER PRIMARY KEY AUTOINCREMENT, `idProdavac` BLOB, `pibProd` TEXT, `nazivProd` TEXT, `adresaProd` TEXT, `gradProd` TEXT, `racunIdProd` INTEGER)
```

### Kolone

| # | Naziv | Tip | NOT NULL | Default | Primary Key |
|---|-------|-----|----------|---------|-------------|
| 0 | `idProd` | INTEGER |  |  | 🔑 |
| 1 | `idProdavac` | BLOB |  |  |  |
| 2 | `pibProd` | TEXT |  |  |  |
| 3 | `nazivProd` | TEXT |  |  |  |
| 4 | `adresaProd` | TEXT |  |  |  |
| 5 | `gradProd` | TEXT |  |  |  |
| 6 | `racunIdProd` | INTEGER |  |  |  |

### Uzorak Podataka (prvih 5 redova)

```json
[
  {
    "idProd": 1,
    "idProdavac": {
      "type": "Buffer",
      "data": [
        150,
        17,
        4,
        24,
        147,
        42,
        65,
        193,
        160,
        220,
        90,
        85,
        158,
        13,
        55,
        78
      ]
    },
    "pibProd": "103882837",
    "nazivProd": "Zara Promenada",
    "adresaProd": "BULEVAR OSLOBOĐENjA 119  1",
    "gradProd": "NOVI SAD",
    "racunIdProd": 1
  },
  {
    "idProd": 2,
    "idProdavac": {
      "type": "Buffer",
      "data": [
        150,
        17,
        4,
        24,
        147,
        42,
        65,
        193,
        160,
        220,
        90,
        85,
        158,
        13,
        55,
        78
      ]
    },
    "pibProd": "103882837",
    "nazivProd": "Zara Promenada",
    "adresaProd": "BULEVAR OSLOBOĐENjA 119  1",
    "gradProd": "NOVI SAD",
    "racunIdProd": 2
  },
  {
    "idProd": 3,
    "idProdavac": {
      "type": "Buffer",
      "data": [
        150,
        17,
        4,
        24,
        147,
        42,
        65,
        193,
        160,
        220,
        90,
        85,
        158,
        13,
        55,
        78
      ]
    },
    "pibProd": "103882837",
    "nazivProd": "Zara Promenada",
    "adresaProd": "BULEVAR OSLOBOĐENjA 119  1",
    "gradProd": "NOVI SAD",
    "racunIdProd": 3
  },
  {
    "idProd": 4,
    "idProdavac": {
      "type": "Buffer",
      "data": [
        240,
        219,
        118,
        105,
        13,
        192,
        73,
        200,
        142,
        65,
        99,
        143,
        201,
        100,
        137,
        67
      ]
    },
    "pibProd": "109952524",
    "nazivProd": "Under Armour Boki trece",
    "adresaProd": "BULEVAR OSLOBOĐENjA 119",
    "gradProd": "NOVI SAD",
    "racunIdProd": 4
  },
  {
    "idProd": 5,
    "idProdavac": {
      "type": "Buffer",
      "data": [
        81,
        28,
        6,
        109,
        111,
        66,
        77,
        101,
        144,
        51,
        145,
        194,
        0,
        9,
        31,
        40
      ]
    },
    "pibProd": "106884584",
    "nazivProd": "Lidl ni1",
    "adresaProd": "IVA ANDRIĆA 16",
    "gradProd": "NOVI SAD",
    "racunIdProd": 5
  }
]
```

---

## 🗂️ Tabela: `racuni`

**Broj redova:** 15

### SQL Definicija

```sql
CREATE TABLE `racuni` (`idRacun` INTEGER PRIMARY KEY AUTOINCREMENT, `iznos` TEXT, `datum` INTEGER NOT NULL, `pfr_broj` TEXT, `status` INTEGER, `racun_data` TEXT, `racun_img` TEXT, `idProd` INTEGER, `idProdavac` BLOB, `pibProd` TEXT, `nazivProd` TEXT, `adresaProd` TEXT, `gradProd` TEXT, `racunIdProd` INTEGER)
```

### Kolone

| # | Naziv | Tip | NOT NULL | Default | Primary Key |
|---|-------|-----|----------|---------|-------------|
| 0 | `idRacun` | INTEGER |  |  | 🔑 |
| 1 | `iznos` | TEXT |  |  |  |
| 2 | `datum` | INTEGER | ✅ |  |  |
| 3 | `pfr_broj` | TEXT |  |  |  |
| 4 | `status` | INTEGER |  |  |  |
| 5 | `racun_data` | TEXT |  |  |  |
| 6 | `racun_img` | TEXT |  |  |  |
| 7 | `idProd` | INTEGER |  |  |  |
| 8 | `idProdavac` | BLOB |  |  |  |
| 9 | `pibProd` | TEXT |  |  |  |
| 10 | `nazivProd` | TEXT |  |  |  |
| 11 | `adresaProd` | TEXT |  |  |  |
| 12 | `gradProd` | TEXT |  |  |  |
| 13 | `racunIdProd` | INTEGER |  |  |  |

### Uzorak Podataka (prvih 5 redova)

```json
[
  {
    "idRacun": 1,
    "iznos": "3290,00",
    "datum": 1667300975000,
    "pfr_broj": "XLM7C5FF-XLM7C5FF-39148",
    "status": 1,
    "racun_data": "============ ФИСКАЛНИ РАЧУН ============\r\n103882837\r\nITX RS\r\nZara Promenada \r\nБУЛЕВАР ОСЛОБОЂЕЊА 119  1 \r\nНови Сад\r\nКасир:                              7080\r\nЕСИР број:                      849/1.01\r\n-------------ПРОМЕТ ПРОДАЈА-------------\r\nАртикли\r\n========================================\r\nНазив   Цена         Кол.         Укупно\r\n0385430080003 DUKSERICA         /kom (Ђ)\r\n     3.290,00          1        3.290,00\r\n----------------------------------------\r\nУкупан износ:                   3.290,00\r\nПлатна картица:                 3.290,00\r\n========================================\r\nОзнака       Име      Стопа        Порез\r\nЂ           О-ПДВ   20,00%        548,33\r\n----------------------------------------\r\nУкупан износ пореза:              548,33\r\n========================================\r\nПФР време:          01.11.2022. 12:09:35\r\nПФР број рачуна: XLM7C5FF-XLM7C5FF-39148\r\nБројач рачуна:             37172/39148ПП\r\n========================================\r\n======== КРАЈ ФИСКАЛНОГ РАЧУНА =========",
    "racun_img": "data:image/gif;base64,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",
    "idProd": null,
    "idProdavac": null,
    "pibProd": "103882837",
    "nazivProd": "Zara Promenada",
    "adresaProd": "BULEVAR OSLOBOĐENjA 119  1",
    "gradProd": "NOVI SAD",
    "racunIdProd": null
  },
  {
    "idRacun": 2,
    "iznos": "5200,00",
    "datum": 1667299752000,
    "pfr_broj": "J89CCFQZ-J89CCFQZ-44785",
    "status": 1,
    "racun_data": "============ ФИСКАЛНИ РАЧУН ============\r\n103882837\r\nITX RS\r\nPull & Bear Promenada\r\nБУЛЕВАР ОСЛОБОЂЕЊА 119   \r\nНови Сад\r\nКасир:                              6963\r\nЕСИР број:                      849/1.01\r\n-------------ПРОМЕТ ПРОДАЈА-------------\r\nАртикли\r\n========================================\r\nНазив   Цена         Кол.         Укупно\r\n0459059070003 PLIS              /kom (Ђ)\r\n     2.590,00          1        2.590,00\r\n0859151325003 PLIS              /kom (Ђ)\r\n     2.590,00          1        2.590,00\r\nK000010000003 папирна кеса М    /kom (Ђ)\r\n        20,00          1           20,00\r\n----------------------------------------\r\nУкупан износ:                   5.200,00\r\nПлатна картица:                 5.200,00\r\n========================================\r\nОзнака       Име      Стопа        Порез\r\nЂ           О-ПДВ   20,00%        866,67\r\n----------------------------------------\r\nУкупан износ пореза:              866,67\r\n========================================\r\nПФР време:          01.11.2022. 11:49:12\r\nПФР број рачуна: J89CCFQZ-J89CCFQZ-44785\r\nБројач рачуна:             43790/44785ПП\r\n========================================\r\n======== КРАЈ ФИСКАЛНОГ РАЧУНА =========",
    "racun_img": "data:image/gif;base64,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",
    "idProd": null,
    "idProdavac": null,
    "pibProd": "103882837",
    "nazivProd": "Pull & Bear Promenada",
    "adresaProd": "BULEVAR OSLOBOĐENjA 119",
    "gradProd": "NOVI SAD",
    "racunIdProd": null
  },
  {
    "idRacun": 3,
    "iznos": "12460,00",
    "datum": 1668538929000,
    "pfr_broj": "NGEJ8E45-NGEJ8E45-55056",
    "status": 1,
    "racun_data": "============ ФИСКАЛНИ РАЧУН ============\r\n103882837\r\nITX RS\r\nZara Promenada \r\nБУЛЕВАР ОСЛОБОЂЕЊА 119  1 \r\nНови Сад\r\nКасир:                              8879\r\nЕСИР број:                      849/1.01\r\n-------------ПРОМЕТ ПРОДАЈА-------------\r\nАртикли\r\n========================================\r\nНазив   Цена         Кол.         Укупно\r\n0504870562010 MAJICA            /kom (Ђ)\r\n     1.090,00          1        1.090,00\r\n0279571345010 MAJICA            /kom (Ђ)\r\n     1.190,00          1        1.190,00\r\n0147371244234 HALJINA           /kom (Ђ)\r\n     2.790,00          1        2.790,00\r\n0900774892210 PANTALONE         /kom (Ђ)\r\n     1.990,00          1        1.990,00\r\n0963260862010 PANTALONE         /kom (Ђ)\r\n     2.790,00          1        2.790,00\r\n0668870380010 PANTALONE         /kom (Ђ)\r\n     2.590,00          1        2.590,00\r\nK000010000003 папирна кеса М    /kom (Ђ)\r\n        20,00          1           20,00\r\n----------------------------------------\r\nУкупан износ:                  12.460,00\r\nПлатна картица:                12.460,00\r\n========================================\r\nОзнака       Име      Стопа        Порез\r\nЂ           О-ПДВ   20,00%      2.076,67\r\n----------------------------------------\r\nУкупан износ пореза:            2.076,67\r\n========================================\r\nПФР време:          15.11.2022. 20:02:09\r\nПФР број рачуна: NGEJ8E45-NGEJ8E45-55056\r\nБројач рачуна:             49375/55056ПП\r\n========================================\r\n======== КРАЈ ФИСКАЛНОГ РАЧУНА =========",
    "racun_img": "data:image/gif;base64,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",
    "idProd": null,
    "idProdavac": null,
    "pibProd": "103882837",
    "nazivProd": "Zara Promenada",
    "adresaProd": "BULEVAR OSLOBOĐENjA 119  1",
    "gradProd": "NOVI SAD",
    "racunIdProd": null
  },
  {
    "idRacun": 4,
    "iznos": "13190,00",
    "datum": 1669916169000,
    "pfr_broj": "AW3AESN2-AW3AESN2-10140",
    "status": 1,
    "racun_data": "============ ФИСКАЛНИ РАЧУН ============\r\n109952524\r\nKVANTUM SPORT\r\nTC PROMENADA \r\nБУЛЕВАР ОСЛОБОЂЕЊА 119   \r\nНови Сад\r\nКасир:                            Radnik\r\nЕСИР број:                     139/6.0.0\r\nЕСИР време:         01.12.2022. 17:36:09\r\n-------------ПРОМЕТ ПРОДАЈА-------------\r\nАртикли\r\n========================================\r\nНазив   Цена         Кол.         Укупно\r\n1357128-001-UA RIVAL FLEECE JOGGERS/PCS \r\n(Ђ)                                     \r\n     6.390,00          1        6.390,00\r\n1373882-001-UA ESSENTIAL FLEECE JOGGER/P\r\nCS (Ђ)                                  \r\n     6.790,00          1        6.790,00\r\n222-KESA SREDNJA/PCS (Ђ)                \r\n        10,00          1           10,00\r\n----------------------------------------\r\nУкупан износ:                  13.190,00\r\nПлатна картица:                13.190,00\r\n========================================\r\nОзнака       Име      Стопа        Порез\r\nЂ           О-ПДВ   20,00%      2.198,33\r\n----------------------------------------\r\nУкупан износ пореза:            2.198,33\r\n========================================\r\nПФР време:          01.12.2022. 18:36:09\r\nПФР број рачуна: AW3AESN2-AW3AESN2-10140\r\nБројач рачуна:              9684/10140ПП\r\n========================================\r\n======== КРАЈ ФИСКАЛНОГ РАЧУНА =========",
    "racun_img": "data:image/gif;base64,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",
    "idProd": null,
    "idProdavac": null,
    "pibProd": "109952524",
    "nazivProd": "TC PROMENADA",
    "adresaProd": "BULEVAR OSLOBOĐENjA 119",
    "gradProd": "NOVI SAD",
    "racunIdProd": null
  },
  {
    "idRacun": 5,
    "iznos": "5304,79",
    "datum": 1670140829000,
    "pfr_broj": "TQLGFLMS-TQLGFLMS-41030",
    "status": 1,
    "racun_data": "============ ФИСКАЛНИ РАЧУН ============\r\n106884584\r\nLIDL SRBIJA\r\nProdavnica br. 0174\r\nИВА АНДРИЋА 16   \r\nНови Сад\r\nКасир:                                12\r\nЕСИР број:               625/12.08.09.60\r\n-------------ПРОМЕТ ПРОДАЈА-------------\r\nАртикли\r\n========================================\r\nНазив   Цена         Кол.         Укупно\r\nČeri grapolo 300g/KOM (Е)               \r\n       269,99          1          269,99\r\nPečenica suva/KOM (Ђ)                   \r\n       219,99          1          219,99\r\nPečenica dimljena/KOM (Ђ)               \r\n       109,99          1          109,99\r\nDimljeni vrat/KOM (Ђ)                   \r\n       119,99          1          119,99\r\nSirni namaz 60%/KOM (Ђ)                 \r\n       179,99          1          179,99\r\nParadajz šljivar Rom/KOM (Е)            \r\n       199,99          1          199,99\r\nProfiterole dezert/KOM (Ђ)              \r\n       399,99          1          399,99\r\nNemački maslac/KOM (Ђ)                  \r\n       399,99          1          399,99\r\nSendvič sir u listić/KOM (Ђ)            \r\n       339,99          1          339,99\r\nEdamer sir u listići/KOM (Ђ)            \r\n       209,99          1          209,99\r\nTortelloni sa medom/KOM (Ђ)             \r\n       249,99          1          249,99\r\nLED svetleći lanac/KOM (Ђ)              \r\n       399,99          1          399,99\r\nPuter sa mor.soli/KOM (Ђ)               \r\n       419,99          1          419,99\r\nPuter sa mor.soli/KOM (Ђ)               \r\n       419,99          1          419,99\r\nTortelloni sa medom/KOM (Ђ)             \r\n       249,99          1          249,99\r\nPavlaka za kuvanje 2/KOM (Ђ)            \r\n       294,99          1          294,99\r\nPasirani paradajz/KOM (Ђ)               \r\n       109,99          1          109,99\r\nDuvan čvarci/KOM (Ђ)                    \r\n       249,99          1          249,99\r\nPrezle/KOM (Ђ)                          \r\n       119,99          1          119,99\r\nSveže njoke/KOM (Ђ)                     \r\n       169,99          1          169,99\r\nSveže njoke/KOM (Ђ)                     \r\n       169,99          1          169,99\r\n----------------------------------------\r\nУкупан износ:                   5.304,79\r\nПлатна картица:                 5.304,79\r\n========================================\r\nОзнака       Име      Стопа        Порез\r\nЕ           П-ПДВ   10,00%         42,73\r\nЂ           О-ПДВ   20,00%        805,80\r\n----------------------------------------\r\nУкупан износ пореза:              848,53\r\n========================================\r\nПФР време:           04.12.2022. 9:00:29\r\nПФР број рачуна: TQLGFLMS-TQLGFLMS-41030\r\nБројач рачуна:             40228/41030ПП\r\n========================================\r\n======== КРАЈ ФИСКАЛНОГ РАЧУНА =========",
    "racun_img": "data:image/gif;base64,R0lGODlhhAGEAfcAAAAAAAAAMwAAZgAAmQAAzAAA/wArAAArMwArZgArmQArzAAr/wBVAABVMwBVZgBVmQBVzABV/wCAAACAMwCAZgCAmQCAzACA/wCqAACqMwCqZgCqmQCqzACq/wDVAADVMwDVZgDVmQDVzADV/wD/AAD/MwD/ZgD/mQD/zAD//zMAADMAMzMAZjMAmTMAzDMA/zMrADMrMzMrZjMrmTMrzDMr/zNVADNVMzNVZjNVmTNVzDNV/zOAADOAMzOAZjOAmTOAzDOA/zOqADOqMzOqZjOqmTOqzDOq/zPVADPVMzPVZjPVmTPVzDPV/zP/ADP/MzP/ZjP/mTP/zDP//2YAAGYAM2YAZmYAmWYAzGYA/2YrAGYrM2YrZmYrmWYrzGYr/2ZVAGZVM2ZVZmZVmWZVzGZV/2aAAGaAM2aAZmaAmWaAzGaA/2aqAGaqM2aqZmaqmWaqzGaq/2bVAGbVM2bVZmbVmWbVzGbV/2b/AGb/M2b/Zmb/mWb/zGb//5kAAJkAM5kAZpkAmZkAzJkA/5krAJkrM5krZpkrmZkrzJkr/5lVAJlVM5lVZplVmZlVzJlV/5mAAJmAM5mAZpmAmZmAzJmA/5mqAJmqM5mqZpmqmZmqzJmq/5nVAJnVM5nVZpnVmZnVzJnV/5n/AJn/M5n/Zpn/mZn/zJn//8wAAMwAM8wAZswAmcwAzMwA/8wrAMwrM8wrZswrmcwrzMwr/8xVAMxVM8xVZsxVmcxVzMxV/8yAAMyAM8yAZsyAmcyAzMyA/8yqAMyqM8yqZsyqmcyqzMyq/8zVAMzVM8zVZszVmczVzMzV/8z/AMz/M8z/Zsz/mcz/zMz///8AAP8AM/8AZv8Amf8AzP8A//8rAP8rM/8rZv8rmf8rzP8r//9VAP9VM/9VZv9Vmf9VzP9V//+AAP+AM/+AZv+Amf+AzP+A//+qAP+qM/+qZv+qmf+qzP+q///VAP/VM//VZv/Vmf/VzP/V////AP//M///Zv//mf//zP///wAAAAAAAAAAAAAAACH5BAEAAPwALAAAAACEAYQBAAj/AAEIHEiwoMGD+xIqXJjwIICFBCEOZKjQoUSDFx9WdIiQ4r6IGwVmBEmRY0ePITmiHHlyJUuTJD/CnBkTZUyLKTO6bNiSps+fPnfKxJizaMmeSEWmnGlzotGhBZsG3cmUKkyhL2lmBVrT482kGnkqdYlTLNezZ4WWharTK9ivY6FWPRoXblS3U8letWoS69KfW9GqdWrWblu9RAujXTx35VrDeO8qrktY7l66Ydn+jRs4sePLn/v6tZyXNOPBlD1DRizZNOPKozWbjd0Vc23ZuFGffno4dObet3sL56t1c+vbrz1LVcn7aXDiz1kPlw4dtnPrrBdPzx15+fbt0RkC/+2cGXny8I3Np/49ei3tyuG/G/fePLvg+twx059NfD/W8catJt552A0oGn/64adbfN0p2KB9nF0XIYRcgVeghevp5t+CoKVXIIEXBgjfhyNO+N9bYMVGnoDqlVdia8CFiKCB7Pnl3oOutUTeiiQeqOJ7yrWXoojr2fWYjL55mCGORvboookY1nhikAlOxpxtKPq4448q3mjjkFY2WSSYXQImoZQs6nimhjgCCSOTZmKpWpw0esklhXceOeacfF6Z35TFzdhijFTihp6TeapZZY6FKhlonYremSSSy6Xpo55+Ckjok35WGumhSy66qaNZJdpnqUS+SV2YWXLK5qqGdv/YqqVovrglhYP2h1+urJ46H5eYotqrqr7xuKerusIq5nGz2rqrs8Ny2CiSmj57bLC//oitlcZK6R+A3Do447cvYrosreReSy1o8gmKKJylLWsqs8d266a92f7Zbqzq1ptqlOCatum81Q7r6Lnr+rooqBWmKq+4f5IKL6fmlktmtw+7C2V1oUKaVr6NedrxwBw/GvC2xUaGMsnRgiyridq5PLKQCnvccLgt42ktsri+bPLFbf6786it3hrxfTjz623JACMtsNA6j7tmyQf7XDCNItNba8dVb6zsuwaTSevYkRptJ8tlwpzw0lInzfDJFk+rtteT0p3u1hTTia7MeRfnanbZU2sLdsqwCquvw2KzOzSwgH89d98/cx03z4yyXbnhd8+7YdCi8i1t5JDzijXjfid7dL+ZQqs02aXn/LTjlm/e9uiFe061z0ZHSTCIlO+tce+q+6402sIXH/zxkicPvPLEI7887yA2z3zgw1Nv/PS/S/+89txb73z32Z8J/XngVx/++eanf/323mOv/vfts4/++kSPv9v88OPvPv3xl8+//vJ73/7yJ8DnkU9SX0KdnTL2ugYGTHarU92+Vsa02/lrdpjb2dsohcAOwu6B4puc4UDYud9dbYMzi1rdtHa1DM7ubPny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",
    "idProd": null,
    "idProdavac": null,
    "pibProd": "106884584",
    "nazivProd": "Prodavnica br. 0174",
    "adresaProd": "IVA ANDRIĆA 16",
    "gradProd": "NOVI SAD",
    "racunIdProd": null
  }
]
```

---

## 🗂️ Tabela: `room_master_table`

**Broj redova:** 1

### SQL Definicija

```sql
CREATE TABLE room_master_table (id INTEGER PRIMARY KEY,identity_hash TEXT)
```

### Kolone

| # | Naziv | Tip | NOT NULL | Default | Primary Key |
|---|-------|-----|----------|---------|-------------|
| 0 | `id` | INTEGER |  |  | 🔑 |
| 1 | `identity_hash` | TEXT |  |  |  |

### Uzorak Podataka (prvih 5 redova)

```json
[
  {
    "id": 42,
    "identity_hash": "25f56e0cb33239ed95ad05e41d816a02"
  }
]
```

---

## 🔄 Mapiranje na Fiskalni-Račun Strukturu

### Preporuke za Migraciju

Na osnovu analize, potrebno je:

1. **Identifikovati odgovarajuće tabele:**
   - Pronađi tabele sa računima/fiskalnim računima
   - Pronađi tabele sa artiklima/stavkama
   - Pronađi tabele sa kategorijama

2. **Mapirati kolone:**
   - `Receipt` interfejs: merchantName, pib, date, time, totalAmount, items, category
   - `ReceiptItem` interfejs: name, quantity, price, total

3. **Kreirati import skriptu:**
   - Pročitaj SQLite bazu
   - Transformiši podatke u Dexie format
   - Import u IndexedDB
