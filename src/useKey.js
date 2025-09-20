import { useEffect } from "react";

export function useKey(action, key1, key2) {
    useEffect(() => {
        function handlekeyPress(e) {
            if (e.code === key1 || e.code === key2) {
                action()
            }
        }

        document.addEventListener('keydown', handlekeyPress);

        return function () {
            document.removeEventListener('keydown', handlekeyPress);
        }

    }, [action, key1, key2]);
}