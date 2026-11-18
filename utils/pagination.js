//Pagination des routes GET
//Utilisation dans Postman: GET /api/livres?page=2&limit=5

//1- Lire page et limit dans req.query et calculer l'offset (nombre d'elements a sauter)
export const getPagination = (query) => {
    const page = Math.max(parseInt(query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100)
    const offset = (page - 1) * limit
    return { page, limit, offset }
}

//2- Construire la reponse a partir du resultat de Model.findAndCountAll()
//   findAndCountAll retourne { count: nombre total, rows: elements de la page }
export const getPagingData = ({ count, rows }, page, limit) => ({
    data: rows,
    pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
    }
})
