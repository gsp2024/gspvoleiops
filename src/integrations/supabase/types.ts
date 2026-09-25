export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cobrancas: {
        Row: {
          atleta_id: string
          created_at: string
          descricao: string
          id: string
          metodo: string | null
          pago_em: string | null
          status: string
          torneio_id: string | null
          turma_id: string | null
          valor: number
          vencimento: string
        }
        Insert: {
          atleta_id: string
          created_at?: string
          descricao: string
          id?: string
          metodo?: string | null
          pago_em?: string | null
          status?: string
          torneio_id?: string | null
          turma_id?: string | null
          valor?: number
          vencimento: string
        }
        Update: {
          atleta_id?: string
          created_at?: string
          descricao?: string
          id?: string
          metodo?: string | null
          pago_em?: string | null
          status?: string
          torneio_id?: string | null
          turma_id?: string | null
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_torneio_id_fkey"
            columns: ["torneio_id"]
            isOneToOne: false
            referencedRelation: "torneios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricoes_torneio: {
        Row: {
          atleta_id: string
          created_at: string
          id: string
          torneio_id: string
        }
        Insert: {
          atleta_id: string
          created_at?: string
          id?: string
          torneio_id: string
        }
        Update: {
          atleta_id?: string
          created_at?: string
          id?: string
          torneio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_torneio_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_torneio_torneio_id_fkey"
            columns: ["torneio_id"]
            isOneToOne: false
            referencedRelation: "torneios"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais: {
        Row: {
          created_at: string
          id: string
          minimo: number
          nome: string
          quantidade: number
          unidade: string
        }
        Insert: {
          created_at?: string
          id?: string
          minimo?: number
          nome: string
          quantidade?: number
          unidade?: string
        }
        Update: {
          created_at?: string
          id?: string
          minimo?: number
          nome?: string
          quantidade?: number
          unidade?: string
        }
        Relationships: []
      }
      matriculas: {
        Row: {
          atleta_id: string
          created_at: string
          id: string
          turma_id: string
        }
        Insert: {
          atleta_id: string
          created_at?: string
          id?: string
          turma_id: string
        }
        Update: {
          atleta_id?: string
          created_at?: string
          id?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_caixa: {
        Row: {
          categoria: string | null
          created_at: string
          data: string
          descricao: string
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data?: string
          descricao: string
          id?: string
          tipo: string
          valor?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: []
      }
      movimentacoes_material: {
        Row: {
          created_at: string
          id: string
          material_id: string
          motivo: string | null
          quantidade: number
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          motivo?: string | null
          quantidade?: number
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          motivo?: string | null
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_material_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_uniforme: {
        Row: {
          atleta_id: string
          created_at: string
          id: string
          item: string
          quantidade: number
          status: string
          tamanho: string | null
          valor: number
        }
        Insert: {
          atleta_id: string
          created_at?: string
          id?: string
          item: string
          quantidade?: number
          status?: string
          tamanho?: string | null
          valor?: number
        }
        Update: {
          atleta_id?: string
          created_at?: string
          id?: string
          item?: string
          quantidade?: number
          status?: string
          tamanho?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_uniforme_atleta_id_fkey"
            columns: ["atleta_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          data_nascimento: string | null
          documento: string | null
          email: string | null
          foto_url: string | null
          id: string
          nome: string
          onboarding_completo: boolean
          posicao: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_nascimento?: string | null
          documento?: string | null
          email?: string | null
          foto_url?: string | null
          id: string
          nome?: string
          onboarding_completo?: boolean
          posicao?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_nascimento?: string | null
          documento?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          onboarding_completo?: boolean
          posicao?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      torneios: {
        Row: {
          created_at: string
          data: string | null
          id: string
          local: string | null
          nome: string
          resultado: string | null
          taxa_inscricao: number
        }
        Insert: {
          created_at?: string
          data?: string | null
          id?: string
          local?: string | null
          nome: string
          resultado?: string | null
          taxa_inscricao?: number
        }
        Update: {
          created_at?: string
          data?: string | null
          id?: string
          local?: string | null
          nome?: string
          resultado?: string | null
          taxa_inscricao?: number
        }
        Relationships: []
      }
      turmas: {
        Row: {
          ativa: boolean
          capacidade: number
          created_at: string
          horario: string | null
          id: string
          local: string | null
          nome: string
          professor_id: string | null
          valor_mensalidade: number
        }
        Insert: {
          ativa?: boolean
          capacidade?: number
          created_at?: string
          horario?: string | null
          id?: string
          local?: string | null
          nome: string
          professor_id?: string | null
          valor_mensalidade?: number
        }
        Update: {
          ativa?: boolean
          capacidade?: number
          created_at?: string
          horario?: string | null
          id?: string
          local?: string | null
          nome?: string
          professor_id?: string | null
          valor_mensalidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "turmas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compartilha_turma: { Args: { _atleta_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gestora: { Args: never; Returns: boolean }
      is_professor_da_turma: { Args: { _turma_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "gestora" | "professor" | "atleta"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["gestora", "professor", "atleta"],
    },
  },
} as const
