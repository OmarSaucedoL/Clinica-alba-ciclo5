# backend/app/services/citas_service.py

def build_citas_query(filters, limit, offset, schema_name, table_name):
   
    query = f"""
        SELECT id_personal, id_paciente, fecha_registro, fecha_agendamiento, estado_cita, id_sala, cita_obs
        FROM {schema_name}.{table_name}
        WHERE 1=1
    """
    params = []
    

    # Filtro por Fecha de Agendamiento
    if 'fecha' in filters and filters['fecha']:
        query += " AND DATE(fecha_agendamiento) = %s"
        params.append(filters['fecha'])
        
    # Filtro por Estado
    if 'estado' in filters and filters['estado']:
        query += " AND estado_cita = %s"
        params.append(filters['estado'].upper())
        
    # Filtro por Odontólogo
    if 'id_odontologo' in filters and filters['id_odontologo']:
        query += " AND id_personal = %s"
        params.append(int(filters['id_odontologo']))

    # Paginacion
    query += " ORDER BY fecha_registro DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])
    
    return query, tuple(params)
