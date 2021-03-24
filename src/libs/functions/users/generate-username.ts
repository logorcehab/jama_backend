import { User } from '../../../models'

const Models = {
    User
}

export default async function main(firstName: string, lastName:string) {
    // Reminder - add username generator to the register process
    firstName = firstName.toLowerCase().split(' ').join('.').replace(/[^\w\s]/gi, '');
    lastName = lastName.toLowerCase().split(' ').join('.').replace(/[^\w\s]/gi, '');
    const username = `${firstName}.${lastName}`;
    // Check default username
    const result = await Models.User.findOne({username});
    if (!result)
        return username;
    // Generate random username
    async function generateRandomUsername(firstName1: string, lastName1: string): Promise<string> {
        const baseUsername = `${firstName1.toLowerCase()}.${lastName1.toLowerCase()}`;
        const randomToken = Math.floor((Math.random() * 1000) + 1);
        const usernameOption = `${baseUsername}${randomToken}`;
        const searchResult = await Models.User.findOne({usernameOption});
        if (searchResult)
            return generateRandomUsername(firstName1,lastName1);
        return usernameOption;
    }
    const finalUsername = await generateRandomUsername(firstName, lastName);
    return finalUsername;
}
