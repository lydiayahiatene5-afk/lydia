import multer from "multer"
import path from "path"
import { unlink } from "fs/promises"

//Configuration de multer pour sauvegarder les images dans le dossier uploads/

//1- Ou et sous quel nom sauvegarder le fichier
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        //Nom unique pour eviter d'ecraser un fichier: 1731900000000-123456789.jpg
        const extension = path.extname(file.originalname).toLowerCase()
        const nomUnique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`
        cb(null, nomUnique)
    }
})

//2- Accepter seulement les images
const fileFilter = (req, file, cb) => {
    const typesAcceptes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (typesAcceptes.includes(file.mimetype)) cb(null, true)
    else cb(new Error("Seules les images (jpeg, png, webp, gif) sont acceptees"))
}

//3- Le middleware (taille maximale: 2 Mo)
const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } })

export default upload

//Supprimer une ancienne image du disque (lors d'une mise a jour, d'une suppression ou d'une erreur)
export const supprimerFichier = async (nomFichier) => {
    if (!nomFichier) return
    try {
        await unlink(path.join("uploads", nomFichier))
    } catch (error) {
        //Le fichier n'existe deja plus: ce n'est pas grave
    }
}
