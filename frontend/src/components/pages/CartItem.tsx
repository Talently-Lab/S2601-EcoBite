import { Button } from "../core/Button";
import { ItemHeader } from "../shared/ItemHeader";
import { AiOutlineDelete } from "react-icons/ai";

export function CartItem({ ...props }) {

    return (
        <div className="cart-item">
            <ItemHeader title={props.name} description={props.description} image={props.img} />
            <Button variant="icon">
                <AiOutlineDelete className="cart-item-remove" />
            </Button>
        </div>
    );
}
