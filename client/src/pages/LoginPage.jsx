import { useContext, useState } from "react";
import { Link , Navigate} from "react-router-dom";
import axios from "axios";
import { UserContext } from "../UserContext";
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [redirect, setRedirect] = useState(false);
    const {setUser}= useContext(UserContext);
    async function handleLoginSubmit(ev) {
        ev.preventDefault();
        try {
            const {data}= await axios.post('/login', { email, password });//{withCredentials: true} -> communication bw different ports, so to accept the cookies we have to add this.
            setUser(data);
            alert('Login Successfull!');
            setRedirect(true);
        }
        catch(e) {
            console.log(e);
            alert('Login failed!');
        }
    }   
    if(redirect){
        return <Navigate to= {'/'}/>
    }
    return (
        <div className="mt-4 grow flex items-center justify-around">
            <div className="mb-32">
                <h1 className="text-4xl text-center mb-4">Login</h1><br />
                <form className="mx-auto max-w-md" onSubmit={handleLoginSubmit}>
                    <input type="email" placeholder="your@email.com" value={email} onChange={ev => setEmail(ev.target.value)} />
                    <input type="password" placeholder="password" value={password} onChange={ev => setPassword(ev.target.value)} />
                    <button className="primary">Login</button>
                    <div className="text-center py-2 text-gray-500">
                        Don't have an account yet? <Link className="underline text-black" to={'/register'}>Register Now</Link>
                    </div>
                </form>
            </div>
        </div>

    );
}