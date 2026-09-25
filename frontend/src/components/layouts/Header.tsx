import { Button } from "../core/Button";
import { FaArrowLeft } from "react-icons/fa6";

export function Header({ title }: { title: string }) {
	return (
		<header>
			<Button variant="icon"><FaArrowLeft /></Button>
			<h2>{title}</h2>
		</header>
	);
}
