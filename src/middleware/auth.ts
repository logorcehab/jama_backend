import jwt from 'jsonwebtoken'

const auth = async (req: { headers: { authorization: string; }; userId: any; }, res: any, next: () => void) =>{
    try {
        const token = req.headers.authorization.split(' ')[1];
        const isCustom = token.length < 500

        let decodedData: any
        if (token && isCustom){
            decodedData = jwt.verify(token,process.env.SESSION_SECRET)
            req.userId = decodedData?.id
        }
        else {
            decodedData = jwt.decode(token)
            req.userId = decodedData?.sub
        }
        next();
    } catch (error) {
        console.log(error)
    }
}

export default auth