// test-tool.js
import { obtenerResumenEstado } from './tools/index.js';

async function test() {
    try {
        const resumen = await obtenerResumenEstado({
            programa_id: 'IS',
            jornada: 'Diurna',
            sede: 'NORTE'
        });
        console.log('Resumen:', resumen);
    } catch (err) {
        console.error(err);
    }
}
test();