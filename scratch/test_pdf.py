import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.routes.asistencia_routes import _generar_asistencia_pdf

try:
    pares = [
        {"entrada": "01/07/2026 08:00:00", "salida": "01/07/2026 12:00:00", "duracion": "4h 0m"},
        {"entrada": "02/07/2026 08:00:00", "salida": None, "duracion": "Falta marcar salida"}
    ]
    pdf_bytes = _generar_asistencia_pdf("Dr. Carlos Gómez", "Odontólogo", "2026-07", pares)
    print("PDF generated successfully! Size:", len(pdf_bytes))
except Exception as e:
    import traceback
    traceback.print_exc()
