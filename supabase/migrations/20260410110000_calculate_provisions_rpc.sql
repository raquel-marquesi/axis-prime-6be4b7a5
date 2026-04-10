
-- Function to consolidate billing and bonus provisions for a given month (YYYY-MM)
CREATE OR REPLACE FUNCTION public.calculate_monthly_provisions(p_month TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_payout_date DATE;
    v_record RECORD;
    v_goal NUMERIC;
    v_total_weighted NUMERIC;
    v_total_value NUMERIC;
BEGIN
    -- Set date range for the month
    v_start_date := (p_month || '-01')::DATE;
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    -- Payout date is +4 months from the start of the reference month
    v_payout_date := v_start_date + INTERVAL '4 months';

    -- 1. BILLING PROVISIONS (Grouped by Client/Month)
    -- We'll look at all approved entries for that month
    FOR v_record IN 
        SELECT 
            p.id_cliente,
            SUM(COALESCE(cp.valor, 0) * t.quantidade) as calc_value
        FROM public.timesheet_entries t
        JOIN public.processes p ON t.process_id = p.id
        LEFT JOIN public.contract_pricing cp ON p.id_cliente = cp.client_id
        WHERE t.data_atividade BETWEEN v_start_date AND v_end_date
          AND t.approved_at IS NOT NULL
        GROUP BY p.id_cliente
    LOOP
        INSERT INTO public.billing_provisions (client_id, month, status, total_value, updated_at)
        VALUES (v_record.id_cliente, p_month, 'pending', v_record.calc_value, now())
        ON CONFLICT (client_id, month) DO UPDATE 
        SET total_value = EXCLUDED.total_value, updated_at = now();
    END LOOP;

    -- 2. BONUS PROVISIONS (Grouped by User/Month)
    FOR v_record IN 
        SELECT 
            t.user_id,
            pr.area_setor,
            SUM(COALESCE(a.weight, 1.0) * t.quantidade) as total_weighted
        FROM public.timesheet_entries t
        JOIN public.activity_types a ON t.activity_type_id = a.id
        JOIN public.profiles pr ON t.user_id = pr.id
        WHERE t.data_atividade BETWEEN v_start_date AND v_end_date
          AND t.approved_at IS NOT NULL
        GROUP BY t.user_id, pr.area_setor
    LOOP
        -- Determine Goal based on area_setor
        CASE v_record.area_setor
            WHEN 'execucao' THEN v_goal := 100;
            WHEN 'contingencia' THEN v_goal := 140; -- As per user: 'Contingencia de Iniciais (meta 140)'
            WHEN 'decisao' THEN v_goal := 130;     -- As per user: 'Calculo de Decisao (Meta 130)'
            WHEN 'acoes_coletivas' THEN v_goal := 140;
            ELSE v_goal := 130; -- Default
        END CASE;

        v_total_weighted := v_record.total_weighted;
        
        IF v_total_weighted > v_goal THEN
            v_total_value := (v_total_weighted - v_goal) * 30.00;
        ELSE
            v_total_value := 0;
        END IF;

        INSERT INTO public.bonus_provisions (
            user_id, 
            month, 
            status, 
            total_value, 
            payout_date, 
            calculation_details, 
            updated_at
        )
        VALUES (
            v_record.user_id, 
            p_month, 
            'pending', 
            v_total_value, 
            v_payout_date, 
            jsonb_build_object(
                'goal', v_goal,
                'total_weighted', v_total_weighted,
                'excess', GREATEST(0, v_total_weighted - v_goal),
                'rate', 30.00
            ),
            now()
        )
        ON CONFLICT (user_id, month) DO UPDATE 
        SET 
            total_value = EXCLUDED.total_value, 
            calculation_details = EXCLUDED.calculation_details,
            updated_at = now();
    END LOOP;
END;
$$;
