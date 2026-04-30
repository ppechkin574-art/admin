import React from 'react'

const Forbidden: React.FC = () => (
    <div style={{ padding: 40, textAlign: 'center' }}>
        <h1>403 — Доступ запрещён</h1>
        <p>У вас нет необходимой роли для просмотра этой страницы.</p>
    </div>
)

export default Forbidden
