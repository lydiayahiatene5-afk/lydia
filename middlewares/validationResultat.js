import { validationResult } from "express-validator"
import { supprimerFichier } from "./upload.js"

//Middleware place apres les regles de validation (dossier validations/)
//Si une regle n'est pas respectee, on arrete ici et on renvoie les erreurs (400 Bad Request)
const validationResultat = (req, res, next) => {
    const erreurs = validationResult(req)

    if (!erreurs.isEmpty()) {
        //Multer a deja sauvegarde l'image: on la supprime puisque les donnees sont refusees
        if (req.file) supprimerFichier(req.file.filename)
        return res.status(400).json({ errors: erreurs.array() })
    }

    next()
}

export default validationResultat
