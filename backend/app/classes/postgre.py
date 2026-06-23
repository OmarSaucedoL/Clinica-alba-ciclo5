import psycopg2
from psycopg2 import pool
import time

class PostgreSQL():
    def __init__(self, db_host, db_port, db_name, db_user, db_password):
        self.db_host, self.db_port, self.db_name = db_host, db_port, db_name
        self.db_user, self.db_password = db_user, db_password

        # Usamos ThreadedConnectionPool para evitar problemas de concurrencia en Flask
        self.pool = psycopg2.pool.ThreadedConnectionPool(
            1, 20,
            host=self.db_host,
            port=self.db_port,
            dbname=self.db_name,
            user=self.db_user,
            password=self.db_password
        )

    def create_connection(self):
        conn = self.pool.getconn()
        if conn.closed != 0:
            self.pool.putconn(conn, close=True)
            return self.pool.getconn()
        return conn

    def execute_query(self, query, params=None, fetchall=False, fetchone=False, commit=False):
        conn = None
        cur = None
        try:
            conn = self.create_connection()
            cur = conn.cursor()
            cur.execute(query, params)

            if commit:
                conn.commit()

            result = None
            if cur.description:
                if fetchall:
                    result = cur.fetchall()
                elif fetchone:
                    result = cur.fetchone()
                else:
                    result = cur.rowcount
            
            return result

        except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
            # Si la conexión se cerró inesperadamente, intentamos limpiar y relanzar el error
            # para que el siguiente intento obtenga una conexión nueva
            if conn:
                try:
                    conn.rollback()
                except:
                    pass
            raise e
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if cur:
                cur.close()
            if conn:
                self.pool.putconn(conn)

    def close_connection(self, commit=False):
        pass