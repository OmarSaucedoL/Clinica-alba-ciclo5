import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.config import db, Config

sql_create_function = f"""
CREATE OR REPLACE FUNCTION {Config.SCHEMA}.f_reporte_asistencia(p_id_personal INT, p_mes VARCHAR)
RETURNS TABLE (
    entrada VARCHAR,
    salida VARCHAR,
    duracion VARCHAR
) AS $$
DECLARE
    r RECORD;
    v_entrada TIMESTAMP := NULL;
    v_fmt VARCHAR;
    v_seconds INT;
    v_hours INT;
    v_minutes INT;
BEGIN
    IF length(p_mes) = 4 THEN
        v_fmt := 'YYYY';
    ELSE
        v_fmt := 'YYYY-MM';
    END IF;

    FOR r IN 
        SELECT tipo, fecha_registro 
        FROM {Config.SCHEMA}.t_asistencia 
        WHERE id_personal = p_id_personal AND TO_CHAR(fecha_registro, v_fmt) = p_mes 
        ORDER BY fecha_registro ASC
    LOOP
        IF r.tipo = 'ENTRADA' THEN
            IF v_entrada IS NOT NULL THEN
                entrada := to_char(v_entrada, 'DD/MM/YYYY HH24:MI:SS');
                salida := NULL;
                duracion := 'Falta marcar salida';
                RETURN NEXT;
            END IF;
            v_entrada := r.fecha_registro;
        ELSE -- SALIDA
            IF v_entrada IS NOT NULL THEN
                v_seconds := extract(epoch from (r.fecha_registro - v_entrada))::INT;
                v_hours := v_seconds / 3600;
                v_minutes := (v_seconds % 3600) / 60;
                
                entrada := to_char(v_entrada, 'DD/MM/YYYY HH24:MI:SS');
                salida := to_char(r.fecha_registro, 'DD/MM/YYYY HH24:MI:SS');
                duracion := v_hours || 'h ' || v_minutes || 'm';
                RETURN NEXT;
                v_entrada := NULL;
            ELSE
                entrada := NULL;
                salida := to_char(r.fecha_registro, 'DD/MM/YYYY HH24:MI:SS');
                duracion := 'Falta marcar entrada';
                RETURN NEXT;
            END IF;
        END IF;
    END LOOP;

    IF v_entrada IS NOT NULL THEN
        entrada := to_char(v_entrada, 'DD/MM/YYYY HH24:MI:SS');
        salida := NULL;
        duracion := 'Pendiente (En curso / Falta salida)';
        RETURN NEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;
"""

try:
    print("Creating f_reporte_asistencia database function...")
    db.execute_query(sql_create_function, commit=True)
    print("Function created successfully!")
except Exception as e:
    import traceback
    traceback.print_exc()
