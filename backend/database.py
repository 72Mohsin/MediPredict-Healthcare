import mysql.connector
from mysql.connector import pooling
from config import settings
import uuid

# Connection pool
pool = pooling.MySQLConnectionPool(
    pool_name="medipredict_pool",
    pool_size=5,
    host=settings.MYSQL_HOST,
    port=settings.MYSQL_PORT,
    user=settings.MYSQL_USER,
    password=settings.MYSQL_PASSWORD,
    database=settings.MYSQL_DATABASE,
    charset="utf8mb4",
    collation="utf8mb4_unicode_ci",
    autocommit=True,
)

def get_connection():
    return pool.get_connection()

def gen_id():
    return str(uuid.uuid4())

class DB:
    """Helper class for common DB operations."""

    @staticmethod
    def execute(query: str, params=None, fetch_one=False, fetch_all=False):
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(query, params or ())
            if fetch_one:
                return cursor.fetchone()
            if fetch_all:
                return cursor.fetchall()
            conn.commit()
            return cursor.lastrowid
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def fetch_one(query: str, params=None):
        return DB.execute(query, params, fetch_one=True)

    @staticmethod
    def fetch_all(query: str, params=None):
        return DB.execute(query, params, fetch_all=True)

    @staticmethod
    def insert(query: str, params=None):
        return DB.execute(query, params)
