import { Button } from '../components/core/Button';
import { Input } from '../components/forms/Input';

type LoginProps = {
    onLogin: () => void;
};

export function Login({ onLogin }: LoginProps) {
    return (
        <div className="page login-page">
            <h1>EcoBite</h1>
            <Input type="text" name='username' placeholder="Usuario" autoComplete="given-name"/>
            <Input type="password" name='password' placeholder="Contraseña" />
            <Button type="button" onClick={onLogin}>Ingresar</Button>
        </div>
    );
}
