import { param } from "express-validator"

//Regle reutilisable: l'id dans la route (/:id) doit etre un entier positif
export const idValidation = [
    param("id").isInt({ min: 1 }).withMessage("L'id doit etre un entier positif")
]
