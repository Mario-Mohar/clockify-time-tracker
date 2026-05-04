-- Daten-Export von Railway-Postgres → MariaDB
-- Stand: 2026-05-04
-- Quelle: trolley.proxy.rlwy.net:14302/railway, Tabelle vacations
-- Vor Import: Tabelle muss bereits via initDb() angelegt sein
--             (passiert beim ersten App-Start oder beim ersten API-Request)

INSERT INTO vacations (id, user_id, start_date, end_date, note, created_at) VALUES
  (1, '68d3a9faa3dfb5757922d994', '2026-07-29', '2026-08-07', NULL, '2026-04-18 09:31:03');

-- AUTO_INCREMENT-Counter auf next-id setzen, sodass künftige Inserts nicht kollidieren
ALTER TABLE vacations AUTO_INCREMENT = 2;
